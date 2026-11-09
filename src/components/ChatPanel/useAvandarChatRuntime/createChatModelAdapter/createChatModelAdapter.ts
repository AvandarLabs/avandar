import { Model } from "@avandar/models";
import { isNotNull, matchLiteral, propEq } from "@avandar/utils";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { APIClient } from "@/clients/APIClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { DiscoveryContinuationMessage } from "@/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage";
import { devLogOfflineChat } from "@/components/ChatPanel/offlineChatHelpers/devLogOfflineChat";
import { createAgentGadgetContextLoader } from "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/createAgentGadgetContextLoader";
import {
  buildLocalGadgetName,
  loadTurnGadgetContext,
  toModelMessages,
} from "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/loadTurnGadgetContext";
import { applyChatModelTurnResponse } from "@/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse";
import { ChatAnalyticsPayloads } from "@/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads";
import {
  buildRetryContext,
  chatMessagesKey,
  extractText,
} from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import { runLocalChatTurn } from "@/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/runLocalChatTurn";
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import { isAgentAccessDenied } from "@/components/ChatPanel/useAvandarChatRuntime/isAgentAccessDenied";
import { isNetworkChatFailure } from "@/components/ChatPanel/useAvandarChatRuntime/isNetworkChatFailure";
import { offerOfflineChatFallback } from "@/components/ChatPanel/useAvandarChatRuntime/offerOfflineChatFallback";
import { resolveChatRuntimeMode } from "@/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode";
import { shouldSkipUserMessageConsent } from "@/components/ChatPanel/useAvandarChatRuntime/shouldSkipUserMessageConsent/shouldSkipUserMessageConsent";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { detectBias } from "@/components/privacy/privacy-helpers/detectBias/detectBias";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
import { DataAgentFeature } from "@/lib/agent/dataAgent/browser/DataAgentFeature";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { OfflineModeStore } from "@/stores/OfflineModeStore/OfflineModeStore";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ConsentAck } from "$/types/chat.types";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { AgentTurnGadgetContext } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { ChatModelAdapter, ChatModelRunResult } from "@assistant-ui/react";
import type { MutableRefObject } from "react";

type LastCompletedTurn = {
  messagesKey: string;
  response: ChatResponse.T;
};

/**
 * A user message's text as the model reads it. Discovery continuations get
 * their model wording. View-change lines, recognized the way the stored
 * thread and the hidden-message filter recognize them (the view-change
 * metadata flag, or the line's prefix for lines whose metadata was lost),
 * get any case id hidden. Anything else the user typed is sent as is.
 */
function _userModelContent(
  metadata: Readonly<{ custom?: Record<string, unknown> }> | undefined,
  content: string,
): string {
  if (DiscoveryContinuationMessage.isInternal(metadata)) {
    return DiscoveryContinuationMessage.toModelContent(content);
  }
  const isViewChange =
    ChatViewEvent.isInternal(metadata) ||
    ChatViewEvent.isViewChangeContent(content);
  return isViewChange ? ChatViewEvent.toModelContent(content) : content;
}

/** The thread as Assistant UI hands it to the adapter. */
type ThreadMessages = Parameters<ChatModelAdapter["run"]>[0]["messages"];

/** The thread as the chat's models read it, mentions still as tokens. */
function _toApiMessages(messages: ThreadMessages): ChatClientMessage.T[] {
  return messages
    .map((threadMessage) => {
      const content = extractText(threadMessage.content);
      if (!content) {
        return null;
      }
      return matchLiteral(threadMessage.role, {
        system: Model.make("ChatClientMessage", {
          role: "system" as const,
          content,
        }),
        assistant: Model.make("ChatClientMessage", {
          role: "assistant" as const,
          content,
        }),
        user: Model.make("ChatClientMessage", {
          role: "user" as const,
          content: _userModelContent(threadMessage.metadata, content),
        }),
      });
    })
    .filter((message): message is ChatClientMessage.T => {
      return isNotNull(message);
    });
}

/** One turn's thread, in the form each path may read. */
type TurnMessages = {
  /** The thread with its ref tokens. Only the agent path reads it. */
  apiMessages: ChatClientMessage.T[];
  /** The thread with each mention as `@"Name"`, for every other path. */
  modelMessages: readonly ChatClientMessage.T[];
  gadgetContext: AgentTurnGadgetContext | undefined;
  /** Gadgets the latest user message mentions. */
  mentionCount: number;
  /** The last question as labels show it, each mention as `@Name`. */
  questionLabel: string;
};

/**
 * Builds the turn's thread and loads its attached and mentioned gadgets
 * once. Ref tokens reach only the agent path, which names them with the
 * conversation's vault. Everything else (the consent check, today's chat,
 * offline turns, analytics) reads `@"Name"`.
 */
async function _prepareTurnMessages(
  options: Readonly<{
    messages: ThreadMessages;
    attachedRefs: readonly Gadget.Ref[];
    workspaceId: Workspace.Id;
  }>,
): Promise<TurnMessages> {
  const apiMessages = _toApiMessages(options.messages);
  const gadgetContext = await loadTurnGadgetContext({
    apiMessages,
    attachedRefs: options.attachedRefs,
    loader: createAgentGadgetContextLoader(options.workspaceId),
  });
  const lastUserMessage = [...apiMessages]
    .reverse()
    .find(propEq("role", "user"));
  return {
    apiMessages,
    modelMessages: toModelMessages(apiMessages, gadgetContext),
    gadgetContext,
    mentionCount: ChatMentionToken.refsFromText(lastUserMessage?.content ?? "")
      .length,
    questionLabel: getLastQuestionFromMessages(
      apiMessages,
      buildLocalGadgetName(gadgetContext),
    ),
  };
}

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
 * Runs a turn with the data agent on any page. The agent, and the code
 * that reads the page, load on first use so they stay out of the main
 * bundle. The case designer keeps today's chat until case management
 * moves into the agent.
 */
async function _runAgentTurn(
  options: Readonly<{
    dataAgentTurn: DataAgentTurnOptions;
    pathname: string;
    chatPageContext: ChatPageContext.T;
    dashboardEditorState: DashboardEditorAppState;
  }>,
): Promise<ChatModelRunResult> {
  const { runDataAgentTurn } =
    await import("@/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn");
  return runDataAgentTurn(options.dataAgentTurn, {
    pathname: options.pathname,
    chatPageContext: options.chatPageContext,
    dashboardEditorState: options.dashboardEditorState,
  });
}

/**
 * Handles a failed cloud turn. A network failure with the offline models
 * downloaded offers to answer offline instead, and runs the offline turn
 * when accepted. A chat reset during the failure ends the turn quietly.
 * Anything else is rethrown for the chat to show.
 */
async function _recoverFromChatFailure(
  options: Readonly<{
    error: unknown;
    isGenerationStale: () => boolean;
    copy: ChatRuntimeCopy;
    runOfflineTurn: () => Promise<ChatModelRunResult>;
  }>,
): Promise<ChatModelRunResult> {
  const { error, isGenerationStale, copy, runOfflineTurn } = options;
  if (isGenerationStale()) {
    return { content: [] };
  }
  const fallbackMode = resolveChatRuntimeMode({
    navigatorOnLine: navigator.onLine,
    isOfflineModeOn: false,
    isBundleDownloaded: LocalChatModelStore.isBundleDownloaded(),
    chatPostFailed: isNetworkChatFailure(error),
  });
  if (fallbackMode.kind === "offer_local_fallback") {
    const accepted = await offerOfflineChatFallback({
      title: copy.fallbackTitle,
      message: copy.fallbackMessage,
      action: copy.fallbackAction,
    });
    if (isGenerationStale()) {
      return { content: [] };
    }
    if (accepted) {
      return runOfflineTurn();
    }
  }
  throw error;
}

function _isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/**
 * Handles a failed agent turn like `_recoverFromChatFailure`, except for its
 * last step: a failure that would be rethrown becomes a reply instead, so
 * the chat never shows a turn with no content. A refused role gets the
 * access message, and anything else (including a declined or unavailable
 * offline offer) says the assistant could not answer. A chat reset still
 * ends the turn quietly, and a stopped turn is still rethrown.
 */
async function _recoverFromAgentFailure(
  options: Readonly<Parameters<typeof _recoverFromChatFailure>[0]>,
): Promise<ChatModelRunResult> {
  try {
    return await _recoverFromChatFailure(options);
  } catch (error) {
    if (options.isGenerationStale()) {
      return { content: [] };
    }
    if (_isAbortError(error)) {
      throw error;
    }
    const text = isAgentAccessDenied(error)
      ? options.copy.agentAccessDenied
      : options.copy.agentUnavailable;
    return { content: [{ type: "text", text }] };
  }
}

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
      const turnMessages = await _prepareTurnMessages({
        messages,
        attachedRefs,
        workspaceId,
      });
      if (isGenerationStale()) {
        return { content: [] };
      }
      const { apiMessages, modelMessages, gadgetContext } = turnMessages;

      // Bias-check the latest user-typed message before it leaves the
      // browser. Clarification-answer markers and hidden view-change lines
      // skip consent here (clarification answers are pre-vetted via
      // `crossBoundary`; view events are synthetic).
      const lastUserMessage = [...modelMessages]
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
          modelMessages.map(
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
          apiMessages: modelMessages,
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

      const runOfflineTurn = (): Promise<ChatModelRunResult> => {
        return runLocalChatTurn({
          dataAgentTurn: {
            ...dataAgentTurn,
            apiMessages: modelMessages,
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
      };

      if (initialRuntimeMode.kind === "local") {
        return runOfflineTurn();
      }

      if (isAgentTurn) {
        try {
          return finishIfCurrent(
            await _runAgentTurn({
              dataAgentTurn,
              pathname: currentPathname,
              chatPageContext: currentPageContext,
              dashboardEditorState: currentDashboardEditorState,
            }),
          );
        } catch (error) {
          return _recoverFromAgentFailure({
            error,
            isGenerationStale,
            copy: copyRef.current,
            runOfflineTurn,
          });
        }
      }

      const currentMessagesKey = chatMessagesKey(modelMessages);
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
            messages: [...modelMessages],
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
        return _recoverFromChatFailure({
          error,
          isGenerationStale,
          copy: copyRef.current,
          runOfflineTurn,
        });
      }
    },
  };
}
