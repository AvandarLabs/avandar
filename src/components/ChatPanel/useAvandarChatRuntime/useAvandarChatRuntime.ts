import { useLocalRuntime } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaseDesignKickoff } from "@/components/ChatPanel/CaseDesignKickoff/CaseDesignKickoff";
import { ChatContextTrayStore } from "@/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { useChatSessions } from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";
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
import type {
  ChatSessionIndex,
  ChatSessionKind,
} from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import type { StoredChatThread } from "@/components/ChatPanel/ChatThreadStore/ChatThreadStore";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { ChatModelAdapter, ThreadMessageLike } from "@assistant-ui/react";

type SessionStatePersistenceOptions = {
  workspaceId: string;
  userId: string;
  sessionId: string;
  messages: readonly ThreadMessageLike[];
  pendingClarification: StoredChatThread["pendingClarification"];
  pendingCaseTypeDraft: StoredChatThread["pendingCaseTypeDraft"];
  contextTray: Parameters<typeof ChatContextTrayStore.write>[0]["refs"];
};

type LoadedSessionState = StoredChatThread & {
  sessionKind: ChatSessionKind;
  contextTray: Parameters<typeof ChatContextTrayStore.write>[0]["refs"];
};

type LoadSessionStateOptions = {
  index: ChatSessionIndex;
  sessionId: string;
  workspaceId: string;
  userId: string;
  pageContext: Parameters<
    typeof makeNewChatThreadMessagesFromPageContext
  >[0]["pageContext"];
  pathname: string;
};

type ActiveSessionSnapshot = {
  sessionId: string | undefined;
  contextTray: SessionStatePersistenceOptions["contextTray"];
  pendingClarification: StoredChatThread["pendingClarification"];
  pendingCaseTypeDraft: StoredChatThread["pendingCaseTypeDraft"];
};

function _makeSessionSnapshot(
  options: Readonly<ActiveSessionSnapshot>,
): ActiveSessionSnapshot {
  return { ...options };
}

function _persistSessionState(
  options: Readonly<SessionStatePersistenceOptions>,
): void {
  const identity = {
    workspaceId: options.workspaceId,
    userId: options.userId,
    sessionId: options.sessionId,
  };
  ChatThreadStore.writeRecord({
    ...identity,
    messages: options.messages,
    pendingClarification: options.pendingClarification,
    pendingCaseTypeDraft: options.pendingCaseTypeDraft,
  });
  if (options.contextTray.length === 0) {
    ChatContextTrayStore.clear(identity);
    return;
  }
  ChatContextTrayStore.write({
    ...identity,
    refs: options.contextTray,
  });
}

function _makeSessionSeedMessages(options: {
  pageContext: Parameters<
    typeof makeNewChatThreadMessagesFromPageContext
  >[0]["pageContext"];
  pathname: string;
  sessionKind: ChatSessionKind;
}): ThreadMessageLike[] {
  const messages = makeNewChatThreadMessagesFromPageContext({
    pageContext: options.pageContext,
    pathname: options.pathname,
  });
  return options.sessionKind === "case-design"
    ? [
        ...messages,
        {
          role: "user",
          content: CaseDesignKickoff.CONTENT,
          metadata: CaseDesignKickoff.metadata,
        },
      ]
    : messages;
}

function _loadSessionState(
  options: Readonly<LoadSessionStateOptions>,
): LoadedSessionState {
  const identity = {
    workspaceId: options.workspaceId,
    userId: options.userId,
    sessionId: options.sessionId,
  };
  const record = ChatThreadStore.readRecord(identity);
  const sessionKind = options.index.sessions[options.sessionId]?.kind ?? "data";
  return {
    ...record,
    messages:
      record.messages.length > 0
        ? record.messages
        : _makeSessionSeedMessages({
            pageContext: options.pageContext,
            pathname: options.pathname,
            sessionKind,
          }),
    sessionKind,
    contextTray: ChatContextTrayStore.read(identity),
  };
}

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
 * Returns the local runtime plus `startNewChat`, which adds and selects an
 * empty data session.
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
  const { contextTray, pendingClarification, pendingCaseTypeDraft } =
    ChatPanelStateManager.useState();
  const sessions = useChatSessions();
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
  const contextTrayRef = useRef(contextTray);
  const pendingClarificationRef = useRef(pendingClarification);
  const pendingCaseTypeDraftRef = useRef(pendingCaseTypeDraft);
  const sessionKindRef = useRef<ChatSessionKind>("data");
  const activeSessionIdRef = useRef<string>();
  const activeSessionSnapshotRef = useRef<ActiveSessionSnapshot>(
    _makeSessionSnapshot({
      sessionId: undefined,
      contextTray,
      pendingClarification,
      pendingCaseTypeDraft,
    }),
  );
  const skipNextTrayPersistRef = useRef(false);
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
    const selectedId = sessions?.index.selectedId;
    if (!user || !workspace.id || !selectedId) {
      return [];
    }
    const record = ChatThreadStore.readRecord({
      workspaceId: workspace.id,
      userId: user.id,
      sessionId: selectedId,
    });
    const sessionKind = sessions.index.sessions[selectedId]?.kind ?? "data";
    return record.messages.length > 0
      ? record.messages
      : _makeSessionSeedMessages({
          pageContext,
          pathname,
          sessionKind,
        });
  });

  useEffect(
    function synchronizeChatRuntimeDependencies() {
      pageContextRef.current = pageContext;
      pathnameRef.current = pathname;
      dashboardEditorStateRef.current = dashboardEditorState;
      parseSqlRef.current = parseSql;
      userRef.current = user;
      const activeSessionId = activeSessionIdRef.current;
      if (activeSessionId === sessions?.index.selectedId) {
        contextTrayRef.current = contextTray;
        pendingClarificationRef.current = pendingClarification;
        pendingCaseTypeDraftRef.current = pendingCaseTypeDraft;
        activeSessionSnapshotRef.current = _makeSessionSnapshot({
          sessionId: activeSessionId,
          contextTray,
          pendingClarification,
          pendingCaseTypeDraft,
        });
      }
      sessionKindRef.current =
        sessions?.index.sessions[sessions.index.selectedId]?.kind ?? "data";
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
    [
      contextTray,
      dashboardEditorState,
      pageContext,
      pathname,
      pendingCaseTypeDraft,
      pendingClarification,
      parseSql,
      sessions,
      t,
      user,
      workspace,
    ],
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
      sessionKindRef,
    });
    // `createAppStateManager` dispatch fns are stable; refs cover the rest.
  }, [dataExplorerDispatch, dashboardEditorDispatch, chatPanelDispatch]);

  // `useLocalRuntime` builds an Assistant UI runtime that keeps thread state
  // in the browser and routes each turn through the adapter's `run` function.
  const runtime = useLocalRuntime(adapter, { initialMessages });

  const persistActiveSession = useCallback(
    (sessionId: string) => {
      if (!user || !workspace.id) {
        return;
      }
      const snapshot = activeSessionSnapshotRef.current;
      _persistSessionState({
        workspaceId: workspace.id,
        userId: user.id,
        sessionId,
        messages: runtime.thread
          .getState()
          .messages.map(makeLikeFromThreadMessage),
        pendingClarification: snapshot.pendingClarification,
        pendingCaseTypeDraft: snapshot.pendingCaseTypeDraft,
        contextTray: snapshot.contextTray,
      });
      chatGenerationRef.current += 1;
      lastTurnRef.current = undefined;
      runtime.thread.cancelRun();
    },
    [runtime, user, workspace.id],
  );

  useEffect(
    function loadSelectedSession() {
      const selectedId = sessions?.index.selectedId;
      if (!selectedId || !user || !workspace.id) {
        return;
      }
      const previousId = activeSessionIdRef.current;
      if (previousId === selectedId) {
        return;
      }
      if (previousId) {
        persistActiveSession(previousId);
      }
      const loaded = _loadSessionState({
        index: sessions.index,
        sessionId: selectedId,
        workspaceId: workspace.id,
        userId: user.id,
        pageContext: pageContextRef.current,
        pathname: pathnameRef.current,
      });
      activeSessionIdRef.current = selectedId;
      activeSessionSnapshotRef.current = _makeSessionSnapshot({
        sessionId: selectedId,
        contextTray: loaded.contextTray,
        pendingClarification: loaded.pendingClarification,
        pendingCaseTypeDraft: loaded.pendingCaseTypeDraft,
      });
      contextTrayRef.current = loaded.contextTray;
      pendingClarificationRef.current = loaded.pendingClarification;
      pendingCaseTypeDraftRef.current = loaded.pendingCaseTypeDraft;
      sessionKindRef.current = loaded.sessionKind;
      skipNextTrayPersistRef.current = true;
      chatPanelDispatch.setContextTray(loaded.contextTray);
      chatPanelDispatch.setPendingClarification(loaded.pendingClarification);
      chatPanelDispatch.setPendingCaseTypeDraft(loaded.pendingCaseTypeDraft);
      runtime.thread.reset(loaded.messages);
    },
    [
      chatPanelDispatch,
      persistActiveSession,
      runtime,
      sessions,
      user,
      workspace.id,
    ],
  );

  useEffect(
    function persistContextTray() {
      const sessionId = activeSessionIdRef.current;
      if (!sessionId || !user || !workspace.id) {
        return;
      }
      if (skipNextTrayPersistRef.current) {
        skipNextTrayPersistRef.current = false;
        return;
      }
      const identity = {
        workspaceId: workspace.id,
        userId: user.id,
        sessionId,
      };
      if (contextTray.length === 0) {
        ChatContextTrayStore.clear(identity);
        return;
      }
      ChatContextTrayStore.write({ ...identity, refs: contextTray });
    },
    [contextTray, user, workspace.id],
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
          const sessionId = activeSessionIdRef.current;
          if (currentUser && workspaceId && sessionId) {
            ChatThreadStore.writeRecord({
              workspaceId,
              userId: currentUser.id,
              sessionId,
              messages: state.messages.map(makeLikeFromThreadMessage),
              pendingClarification: pendingClarificationRef.current,
              pendingCaseTypeDraft: pendingCaseTypeDraftRef.current,
            });
          }
        }
        wasRunning = isRunning;
      });
    },
    [runtime],
  );

  const startNewChat = useCallback(() => {
    if (!sessions) {
      return;
    }
    sessions.startDataSession();
  }, [sessions]);

  return { runtime, startNewChat };
}
