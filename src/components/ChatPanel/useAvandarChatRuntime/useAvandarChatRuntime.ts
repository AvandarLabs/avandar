import { useLocalRuntime } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaseDesignKickoff } from "@/components/ChatPanel/CaseDesignKickoff/CaseDesignKickoff";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ChatThreadStore } from "@/components/ChatPanel/ChatThreadStore/ChatThreadStore";
import { createChatModelAdapter } from "@/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter";
import { shouldPersistThreadOnRunEnd } from "@/components/ChatPanel/useAvandarChatRuntime/shouldPersistThreadOnRunEnd/shouldPersistThreadOnRunEnd";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { makeNewChatThreadMessagesFromPageContext } from "@/components/ChatPanel/useChatViewTranscript/makeThreadMessagesFromSnapshot";
import { makeLikeFromThreadMessage } from "@/components/ChatPanel/useChatViewTranscript/threadMessageHelpers";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { ChatModelAdapter } from "@assistant-ui/react";

/**
 * The Assistant UI runtime for the Avandar chat panel.
 *
 * On every user turn it serializes the thread into our `ChatClientMessage.T`
 * shape, posts to the `chat/:workspaceId/messages` edge function along with
 * the current page context, and renders the assistant reply. If the model
 * called `generateSql`, the SQL and prompt are pushed into
 * `DataExplorerStateManager`, which causes the Explorer to re-run the query
 * automatically through the existing `useDataQuery` pipeline.
 *
 * Returns the local runtime plus `startNewChat`, which aborts in-flight
 * generation, resets the thread with a pending view event for the current
 * page, and clears persisted storage.
 */
export function useAvandarChatRuntime(): {
  runtime: ReturnType<typeof useLocalRuntime>;
  startNewChat: () => void;
} {
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const pageContext = useChatPageContext();
  const pathname = useRouterState({
    select: (state) => {
      return state.location.pathname;
    },
  });
  const dataExplorerDispatch = DataExplorerStateManager.useDispatch();
  const dashboardEditorDispatch = DashboardEditorStateManager.useDispatch();
  const dashboardEditorState = DashboardEditorStateManager.useState();
  const chatPanelDispatch = ChatPanelStateManager.useDispatch();
  const { parseSql } = useSqlToStructuredQuery();
  const { t } = useLingui();
  // Refs keep the adapter instance stable while still reading fresh values
  // inside `run()`. Including `pageContext` or `parseSql` in the adapter
  // useMemo deps recreates the adapter whenever SQL or dataset metadata
  // changes, which thrashes assistant-ui's local runtime and drops side
  // effects such as `setRawSql` (CHECKPOINTS bug #29).
  const pageContextRef = useRef(pageContext);
  const pathnameRef = useRef(pathname);
  const dashboardEditorStateRef = useRef(dashboardEditorState);
  const parseSqlRef = useRef(parseSql);
  const userRef = useRef(user);
  const workspaceIdRef = useRef(workspace.id);
  const workspaceRef = useRef(workspace);
  const chatGenerationRef = useRef(0);
  const copyRef = useRef<ChatRuntimeCopy>({
    messageNotSent: t`(Message not sent.)`,
    offlineModelRequired: t`Offline mode needs the offline models. Download them from the Offline button under the message box, or turn offline mode off.`,
    sqlApprovalRequired: t`SQL was not applied. Approve the assumed filter values to run this query.`,
    sqlSignInRequired: t`SQL was not applied. Sign in to approve filter values.`,
    sqlResultsReady: t`I ran the query. Your results are ready.`,
    sqlResultsEmpty: t`I ran the query, but no data matched it.`,
    sqlQueryFailed: t`I ran the query, but it failed.`,
    sqlQueryApplied: t`I applied the query in the Data Explorer.`,
    dashboardOnlyBlock: t`I can only add that to a dashboard. Open a dashboard and ask me again there.`,
    fallbackTitle: t`Chat request failed`,
    fallbackMessage: t`The online assistant is unreachable. Answer this message with the offline models on this computer instead?`,
    fallbackAction: t`Answer offline`,
    replying: t`Replying…`,
    understandingQuestion: t`Understanding your question…`,
    writingQuery: t`Writing query…`,
    generatingSql: t`Generating SQL…`,
    repairingQuery: t`Repairing query…`,
    fixingQuery: t`Fixing query…`,
    noSql: t`I could not produce SQL offline. Try rephrasing or reconnect to use cloud chat.`,
    metadataQuery: t`Here is a query based on your workspace metadata.`,
    contextWindowExceeded: t`This question is too long for the offline models. Try a shorter question, or turn offline mode off to use online chat.`,
    agentAccessDenied: t`Answering data questions needs access to the Data Explorer in this workspace.`,
    agentUnavailable: t`The assistant could not answer that. Try again in a moment.`,
  });
  const [initialMessages] = useState(() => {
    return user && workspace.id
      ? ChatThreadStore.read({ workspaceId: workspace.id, userId: user.id })
      : [];
  });
  const hasHydratedPersistedThreadRef = useRef(initialMessages.length > 0);

  useEffect(
    function synchronizeChatRuntimeDependencies() {
      pageContextRef.current = pageContext;
      pathnameRef.current = pathname;
      dashboardEditorStateRef.current = dashboardEditorState;
      parseSqlRef.current = parseSql;
      userRef.current = user;
      workspaceIdRef.current = workspace.id;
      workspaceRef.current = workspace;
      copyRef.current = {
        messageNotSent: t`(Message not sent.)`,
        offlineModelRequired: t`Offline mode needs the offline models. Download them from the Offline button under the message box, or turn offline mode off.`,
        sqlApprovalRequired: t`SQL was not applied. Approve the assumed filter values to run this query.`,
        sqlSignInRequired: t`SQL was not applied. Sign in to approve filter values.`,
        sqlResultsReady: t`I ran the query. Your results are ready.`,
        sqlResultsEmpty: t`I ran the query, but no data matched it.`,
        sqlQueryFailed: t`I ran the query, but it failed.`,
        sqlQueryApplied: t`I applied the query in the Data Explorer.`,
        dashboardOnlyBlock: t`I can only add that to a dashboard. Open a dashboard and ask me again there.`,
        fallbackTitle: t`Chat request failed`,
        fallbackMessage: t`The online assistant is unreachable. Answer this message with the offline models on this computer instead?`,
        fallbackAction: t`Answer offline`,
        replying: t`Replying…`,
        understandingQuestion: t`Understanding your question…`,
        writingQuery: t`Writing query…`,
        generatingSql: t`Generating SQL…`,
        repairingQuery: t`Repairing query…`,
        fixingQuery: t`Fixing query…`,
        noSql: t`I could not produce SQL offline. Try rephrasing or reconnect to use cloud chat.`,
        metadataQuery: t`Here is a query based on your workspace metadata.`,
        contextWindowExceeded: t`This question is too long for the offline models. Try a shorter question, or turn offline mode off to use online chat.`,
        agentAccessDenied: t`Answering data questions needs access to the Data Explorer in this workspace.`,
        agentUnavailable: t`The assistant could not answer that. Try again in a moment.`,
      };
    },
    [dashboardEditorState, pageContext, pathname, parseSql, t, user, workspace],
  );

  // Tracks the last completed turn so we can detect "Try Again". When the
  // user clicks the reload button on an assistant message, assistant-ui
  // removes that message and re-invokes `run()` with the SAME `messages`
  // array as the previous turn, so a key match here is a reliable retry
  // signal. We surface the prior response as `retryContext` on the next
  // request so the backend can nudge the model to a different output.
  const lastTurnRef = useRef<
    | {
        messagesKey: string;
        response: ChatResponse.T;
      }
    | undefined
  >(undefined);

  // The chat's context tray. Empty until the tray has its own state.
  const contextTrayRef = useRef<readonly Gadget.Ref[]>([]);

  const adapter: ChatModelAdapter = useMemo(() => {
    return createChatModelAdapter({
      chatGenerationRef,
      lastTurnRef,
      pageContextRef,
      userRef,
      workspaceIdRef,
      workspaceRef,
      pathnameRef,
      dashboardEditorStateRef,
      parseSqlRef,
      copyRef,
      dataExplorerDispatch,
      dashboardEditorDispatch,
      chatPanelDispatch,
      contextTrayRef,
    });
    // `createAppStateManager` dispatch fns are stable; refs cover the rest.
  }, [dataExplorerDispatch, dashboardEditorDispatch, chatPanelDispatch]);

  // `useLocalRuntime` builds an Assistant UI runtime that keeps thread state
  // in the browser and routes each turn through the adapter's `run` function.
  const runtime = useLocalRuntime(adapter, { initialMessages });

  useEffect(
    function hydratePersistedThreadWhenIdentityIsReady() {
      if (hasHydratedPersistedThreadRef.current || !user || !workspace.id) {
        return;
      }
      const stored = ChatThreadStore.read({
        workspaceId: workspace.id,
        userId: user.id,
      });
      hasHydratedPersistedThreadRef.current = true;
      if (stored.length === 0) {
        return;
      }
      runtime.thread.reset(stored);
    },
    [runtime, user, workspace.id],
  );

  useEffect(
    function persistCommittedThreadWhenRunEnds() {
      let wasRunning = runtime.thread.getState().isRunning;
      let runStartGeneration = chatGenerationRef.current;
      return runtime.thread.subscribe(() => {
        const state = runtime.thread.getState();
        const isRunning = state.isRunning;
        if (!wasRunning && isRunning) {
          runStartGeneration = chatGenerationRef.current;
        }
        if (
          shouldPersistThreadOnRunEnd({
            wasRunning,
            isRunning,
            runStartGeneration,
            currentGeneration: chatGenerationRef.current,
          })
        ) {
          const currentUser = userRef.current;
          const workspaceId = workspaceIdRef.current;
          if (currentUser && workspaceId) {
            ChatThreadStore.write({
              workspaceId,
              userId: currentUser.id,
              messages: state.messages.map(makeLikeFromThreadMessage),
            });
          }
        }
        wasRunning = isRunning;
      });
    },
    [runtime],
  );

  const startNewChat = useCallback(() => {
    chatGenerationRef.current += 1;
    // A new chat that asks the previous question again sends the same
    // messages as that turn, which is how a "Try again" is recognized. The
    // last turn belongs to the old thread, so forget it.
    lastTurnRef.current = undefined;
    runtime.thread.cancelRun();
    // Same as boot after empty hydrate: empty thread + pending view from the
    // current page. `useChatViewTranscript` only re-syncs when the snapshot
    // changes, so New chat on the same route must reseed here.
    runtime.thread.reset(
      makeNewChatThreadMessagesFromPageContext({
        pageContext: pageContextRef.current,
        pathname: pathnameRef.current,
      }),
    );
    const currentUser = userRef.current;
    const workspaceId = workspaceIdRef.current;
    if (currentUser && workspaceId) {
      ChatThreadStore.clear({
        workspaceId,
        userId: currentUser.id,
      });
    }
    chatPanelDispatch.setPendingClarification(undefined);
    if (pageContextRef.current.app === "case-manager") {
      runtime.thread.append({
        role: "user",
        content: [{ type: "text", text: CaseDesignKickoff.CONTENT }],
        metadata: CaseDesignKickoff.metadata,
      });
    }
  }, [runtime, chatPanelDispatch]);

  return { runtime, startNewChat };
}
