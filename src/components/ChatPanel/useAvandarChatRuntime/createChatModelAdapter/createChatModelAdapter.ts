import { propEq } from "@avandar/utils";
import { APIClient } from "@/clients/APIClient";
import { OfflineAnswerMessage } from "@/components/ChatPanel/OfflineAnswerMessage/OfflineAnswerMessage";
import { devLogOfflineChat } from "@/components/ChatPanel/offlineChatHelpers/devLogOfflineChat";
import { applyChatModelTurnResponse } from "@/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse";
import { ChatAnalyticsPayloads } from "@/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads";
import {
  buildRetryContext,
  chatMessagesKey,
} from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import { runLocalChatTurn } from "@/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/runLocalChatTurn";
import { resolveChatRuntimeMode } from "@/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode";
import { shouldSkipUserMessageConsent } from "@/components/ChatPanel/useAvandarChatRuntime/shouldSkipUserMessageConsent/shouldSkipUserMessageConsent";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { detectBias } from "@/components/privacy/privacy-helpers/detectBias/detectBias";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
import { DataAgentFeature } from "@/lib/agent/dataAgent/browser/DataAgentFeature";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { OfflineModeStore } from "@/stores/OfflineModeStore/OfflineModeStore";
import {
  prepareTurnMessages,
  recoverFromAgentFailure,
  recoverFromChatFailure,
  runAgentTurn,
} from "./ChatModelAdapterHelpers";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ConsentAck } from "$/types/chat.types";
import type { LastCompletedTurn } from "./ChatModelAdapterHelpers";
import type { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type {
  DashboardEditorAppState,
  DashboardEditorStateManager,
} from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { ChatModelAdapter, ChatModelRunResult } from "@assistant-ui/react";
import type { MutableRefObject } from "react";

/** Refs and dispatches the chat model adapter reads on each turn. */
export type CreateChatModelAdapterOptions = {
  chatGenerationRef: MutableRefObject<number>;
  lastTurnRef: MutableRefObject<LastCompletedTurn | undefined>;
  pageContextRef: MutableRefObject<ChatPageContext.T>;
  userRef: MutableRefObject<User.T | undefined>;
  workspaceIdRef: MutableRefObject<Workspace.Id>;
  workspaceRef: MutableRefObject<Workspace.T>;
  pathnameRef: MutableRefObject<string>;
  dashboardEditorStateRef: MutableRefObject<DashboardEditorAppState>;
  parseSqlRef: MutableRefObject<
    ReturnType<typeof useSqlToStructuredQuery>["parseSql"]
  >;
  copyRef: MutableRefObject<ChatRuntimeCopy>;
  dataExplorerDispatch: ReturnType<typeof DataExplorerStateManager.useDispatch>;
  dashboardEditorDispatch: ReturnType<
    typeof DashboardEditorStateManager.useDispatch
  >;
  chatPanelDispatch: ReturnType<typeof ChatPanelStateManager.useDispatch>;
  /** The chat's context tray, read when a turn starts. */
  contextTrayRef: MutableRefObject<readonly Gadget.Ref[]>;
};

/**
 * Builds the Assistant UI model adapter that posts each turn and applies
 * SQL, dashboard blocks, and clarifications to the live page.
 */
export function createChatModelAdapter(
  options: Readonly<CreateChatModelAdapterOptions>,
): ChatModelAdapter {
  const {
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
  } = options;
  return {
    run: async ({ messages }): Promise<ChatModelRunResult> => {
      const generation = chatGenerationRef.current;
      const isGenerationStale = (): boolean => {
        return chatGenerationRef.current !== generation;
      };
      const finishIfCurrent = (
        result: ChatModelRunResult,
      ): ChatModelRunResult => {
        return isGenerationStale() ? { content: [] } : result;
      };

      const workspaceId = workspaceIdRef.current;
      const currentUser = userRef.current;
      // The page is read once, here, so the gadget load, consent waits, and
      // navigation during the turn cannot mix one page's context with
      // another page's route.
      const currentPageContext = pageContextRef.current;
      const currentPathname = pathnameRef.current;
      const currentDashboardEditorState = dashboardEditorStateRef.current;
      // Only an agent turn reads the tray. Today's chat never sees it.
      const isAgentTurn =
        currentPageContext.app !== "case-manager" &&
        DataAgentFeature.isEnabled();
      const attachedRefs = isAgentTurn ? contextTrayRef.current : [];
      const turnMessages = await prepareTurnMessages({
        messages,
        attachedRefs,
        workspaceId,
        isAgentTurn,
      });
      if (isGenerationStale()) {
        return { content: [] };
      }
      const { apiMessages, localMessages, hostedChatMessages, gadgetContext } =
        turnMessages;
      // The text the consent check reads: real names on the agent path,
      // and on today's chat the type-only text it posts, so the consent
      // ack's hash matches the posted message.
      const consentMessages = isAgentTurn ? localMessages : hostedChatMessages;

      // Bias-check the latest user-typed message before it leaves the
      // browser. Clarification-answer markers and hidden view-change lines
      // skip consent here (clarification answers are pre-vetted via
      // `crossBoundary`; view events are synthetic).
      const lastUserMessage = [...consentMessages]
        .reverse()
        .find(propEq("role", "user"));

      if (
        lastUserMessage &&
        !shouldSkipUserMessageConsent(lastUserMessage.content) &&
        currentUser
      ) {
        const biasResult = detectBias(lastUserMessage.content);
        if (biasResult.hits.length > 0) {
          const consent = await decideIfDataCanCrossBoundary({
            text: lastUserMessage.content,
            context: "user_message_text",
            workspaceId,
            userId: currentUser.id,
          });
          if (isGenerationStale()) {
            return { content: [] };
          }
          if (!consent.approved) {
            // User cancelled: end the turn with an empty assistant
            // response so the thread stays consistent. The user can
            // re-edit and try again from the composer.
            return {
              content: [
                {
                  type: "text" as const,
                  text: copyRef.current.messageNotSent,
                },
              ],
            };
          }
        }
      }

      // Collect any pre-approved consent acks that cover messages we
      // are about to send. `crossBoundary` registers acks in a
      // module-scope queue keyed by content hash; we drain matching
      // entries here and attach them to the backend request.
      const consentAcks = (
        await Promise.all(
          consentMessages.map(
            async (message, messageIndex): Promise<ConsentAck | undefined> => {
              if (message.role !== "user") {
                return undefined;
              }
              const ackToken = await PendingAcks.consumeAckForText(
                message.content,
              );
              return ackToken
                ? {
                    ackToken,
                    scope: {
                      kind: "message_index" as const,
                      index: messageIndex,
                    },
                  }
                : undefined;
            },
          ),
        )
      ).filter((consentAck): consentAck is ConsentAck => {
        return consentAck !== undefined;
      });
      if (isGenerationStale()) {
        return { content: [] };
      }

      const initialRuntimeMode = resolveChatRuntimeMode({
        navigatorOnLine: navigator.onLine,
        isOfflineModeOn: OfflineModeStore.isOn(),
        isBundleDownloaded: LocalChatModelStore.isBundleDownloaded(),
      });
      devLogOfflineChat("useAvandarChatRuntime:mode", {
        mode: initialRuntimeMode,
        navigatorOnLine: navigator.onLine,
        pageContext: currentPageContext,
      });

      if (
        lastUserMessage &&
        !shouldSkipUserMessageConsent(lastUserMessage.content)
      ) {
        void AnalyticsClient.logEvent({
          event: "chat.message_sent",
          workspaceId,
          app:
            currentPageContext.app === "data-explorer"
              ? "data_explorer"
              : currentPageContext.app === "dashboards"
                ? "dashboards"
                : currentPageContext.app === "data-sources"
                  ? "data_sources"
                  : undefined,
          payload: ChatAnalyticsPayloads.fromMessage({
            content: lastUserMessage.content,
            pageContext: currentPageContext,
            runtimeMode: initialRuntimeMode,
            mentionCount: turnMessages.mentionCount,
            attachedCount: isAgentTurn ? attachedRefs.length : undefined,
          }),
        });
      }

      const applyResponse = async (
        response: ChatResponse.T,
      ): Promise<ChatModelRunResult> => {
        return applyChatModelTurnResponse({
          response,
          apiMessages: localMessages,
          questionLabel: turnMessages.questionLabel,
          currentUser,
          currentPageContext,
          workspaceId,
          isGenerationStale,
          copyRef,
          parseSqlRef,
          dashboardEditorStateRef,
          dataExplorerDispatch,
          dashboardEditorDispatch,
          chatPanelDispatch,
        });
      };

      const applyResponseIfCurrent = async (
        response: ChatResponse.T,
      ): Promise<ChatModelRunResult> => {
        if (isGenerationStale()) {
          return { content: [] };
        }
        return finishIfCurrent(await applyResponse(response));
      };

      const dataAgentTurn: DataAgentTurnOptions = {
        apiMessages,
        gadgetContext,
        workspaceId,
        currentUser,
        chatGeneration: generation,
        parseSqlRef,
        dataExplorerDispatch,
        chatPanelDispatch,
      };

      // Every answer an offline turn produces is marked, so a hosted
      // request later reads a fixed line in its place.
      const runOfflineTurn = async (): Promise<ChatModelRunResult> => {
        const result = await runLocalChatTurn({
          dataAgentTurn: {
            ...dataAgentTurn,
            apiMessages: localMessages,
            gadgetContext: undefined,
            questionLabel: turnMessages.questionLabel,
          },
          workspace: workspaceRef.current,
          pageContext: currentPageContext,
          copy: copyRef.current,
          isGenerationStale,
          finishIfCurrent,
          applyResponseIfCurrent,
        });
        return OfflineAnswerMessage.mark(result);
      };

      if (initialRuntimeMode.kind === "local") {
        return runOfflineTurn();
      }

      if (isAgentTurn) {
        try {
          return finishIfCurrent(
            await runAgentTurn({
              dataAgentTurn,
              pathname: currentPathname,
              chatPageContext: currentPageContext,
              dashboardEditorState: currentDashboardEditorState,
            }),
          );
        } catch (error) {
          return recoverFromAgentFailure({
            error,
            isGenerationStale,
            copy: copyRef.current,
            runOfflineTurn,
          });
        }
      }

      const currentMessagesKey = chatMessagesKey(hostedChatMessages);
      const cachedTurn = lastTurnRef.current;
      const retryContext =
        cachedTurn && cachedTurn.messagesKey === currentMessagesKey
          ? buildRetryContext(cachedTurn.response)
          : undefined;

      try {
        const response = await APIClient.post({
          route: "chat/:workspaceId/messages",
          pathParams: { workspaceId },
          body: {
            messages: [...hostedChatMessages],
            context: currentPageContext,
            ...(consentAcks.length > 0 ? { consentAcks } : {}),
            ...(retryContext ? { retryContext } : {}),
          },
        });
        if (isGenerationStale()) {
          return { content: [] };
        }
        lastTurnRef.current = {
          messagesKey: currentMessagesKey,
          response,
        };
        return applyResponseIfCurrent(response);
      } catch (error) {
        return recoverFromChatFailure({
          error,
          isGenerationStale,
          copy: copyRef.current,
          runOfflineTurn,
        });
      }
    },
  };
}
