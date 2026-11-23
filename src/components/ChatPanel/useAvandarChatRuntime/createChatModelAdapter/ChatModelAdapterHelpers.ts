import { Model } from "@avandar/models";
import { isNotNull, matchLiteral } from "@avandar/utils";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { DiscoveryContinuationMessage } from "@/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage";
import { OfflineAnswerMessage } from "@/components/ChatPanel/OfflineAnswerMessage/OfflineAnswerMessage";
import {
  buildLocalGadgetName,
  loadTurnGadgetContext,
  toHostedChatMessages,
  toLocalModelMessages,
} from "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/loadTurnGadgetContext";
import { extractText } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import { isAgentAccessDenied } from "@/components/ChatPanel/useAvandarChatRuntime/isAgentAccessDenied";
import { isNetworkChatFailure } from "@/components/ChatPanel/useAvandarChatRuntime/isNetworkChatFailure";
import { offerOfflineChatFallback } from "@/components/ChatPanel/useAvandarChatRuntime/offerOfflineChatFallback";
import { resolveChatRuntimeMode } from "@/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { AgentTurnGadgetContext } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { ChatModelAdapter, ChatModelRunResult } from "@assistant-ui/react";

/** Inputs consumed by prepareTurnMessages. */
type PrepareTurnMessagesOptions = {
  messages: ThreadMessages;
  attachedRefs: readonly Gadget.Ref[];
  workspaceId: Workspace.Id;
  isAgentTurn: boolean;
};

/** Inputs consumed by runAgentTurn. */
type RunAgentTurnOptions = {
  dataAgentTurn: DataAgentTurnOptions;
  pathname: string;
  chatPageContext: ChatPageContext.T;
  dashboardEditorState: DashboardEditorAppState;
};

/** Inputs consumed by recoverFromChatFailure. */
type RecoverFromChatFailureOptions = {
  error: unknown;
  isGenerationStale: () => boolean;
  copy: ChatRuntimeCopy;
  runOfflineTurn: () => Promise<ChatModelRunResult>;
};

/** Conversation and user-message identities of the last completed turn. */
export type LastCompletedTurn = {
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
function userModelContent(
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

/**
 * The thread as the chat's models read it, mentions still as tokens. With
 * `hideOfflineAnswers`, each answer an offline turn produced reads as a
 * fixed line: an offline model read real gadget names, so its answer must
 * never reach a hosted model.
 */
function toApiMessages(
  messages: ThreadMessages,
  options: Readonly<{ hideOfflineAnswers: boolean }>,
): ChatClientMessage.T[] {
  return messages
    .map((threadMessage) => {
      const text = extractText(threadMessage.content);
      if (!text) {
        return null;
      }
      const content =
        options.hideOfflineAnswers &&
        threadMessage.role === "assistant" &&
        OfflineAnswerMessage.isOfflineAnswer(threadMessage.metadata)
          ? OfflineAnswerMessage.hostedContent
          : text;
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
          content: userModelContent(threadMessage.metadata, content),
        }),
      });
    })
    .filter((message): message is ChatClientMessage.T => {
      return isNotNull(message);
    });
}

/** One turn's thread, in the form each path may read. */
type TurnMessages = {
  /**
   * The thread with its ref tokens and offline answers hidden. Only the
   * agent path reads it.
   */
  apiMessages: ChatClientMessage.T[];
  /**
   * The thread with each mention as `@"Name"` with its real name, for uses
   * on the device: offline turns, the agent path's consent check, and
   * applying a response. Never posted to a hosted model.
   */
  localMessages: readonly ChatClientMessage.T[];
  /**
   * The thread as today's hosted chat receives it, each mention named by
   * its type only (`@"a chart"`), and offline answers hidden. Its consent
   * check runs on this text, so a consent ack matches the message it is
   * posted with.
   */
  hostedChatMessages: readonly ChatClientMessage.T[];
  gadgetContext: AgentTurnGadgetContext | undefined;
  /**
   * Gadgets the last real question mentions, so a clarification answer
   * does not hide them. Undefined off the agent path.
   */
  mentionCount: number | undefined;
  /** The last question as labels show it, each mention as `@Name`. */
  questionLabel: string;
};

/** Whether the tray or any user message holds a gadget to load. */
function hasGadgetRefs(
  apiMessages: readonly ChatClientMessage.T[],
  attachedRefs: readonly Gadget.Ref[],
): boolean {
  return (
    attachedRefs.length > 0 ||
    apiMessages.some((message) => {
      return (
        message.role === "user" &&
        ChatMentionToken.refsFromText(message.content).length > 0
      );
    })
  );
}

/**
 * Loads the turn's gadgets, or nothing when there are none. The loader and
 * the gadget clients behind it load on first use so they stay out of the
 * main bundle.
 */
async function loadGadgetContext(
  options: Readonly<{
    apiMessages: readonly ChatClientMessage.T[];
    attachedRefs: readonly Gadget.Ref[];
    workspaceId: Workspace.Id;
  }>,
): Promise<AgentTurnGadgetContext | undefined> {
  if (!hasGadgetRefs(options.apiMessages, options.attachedRefs)) {
    return undefined;
  }
  const { createAgentGadgetContextLoader } =
    await import("@/components/ChatPanel/useAvandarChatRuntime/agentMentions/createAgentGadgetContextLoader");
  return loadTurnGadgetContext({
    apiMessages: options.apiMessages,
    attachedRefs: options.attachedRefs,
    loader: createAgentGadgetContextLoader(options.workspaceId),
  });
}

/**
 * Builds the turn's thread and loads its attached and mentioned gadgets
 * once. Ref tokens reach only the agent path, which names them with the
 * conversation's vault. Offline turns and labels read real names; today's
 * hosted chat reads each mention's type only.
 */
export async function prepareTurnMessages(
  options: Readonly<PrepareTurnMessagesOptions>,
): Promise<TurnMessages> {
  const apiMessages = toApiMessages(options.messages, {
    hideOfflineAnswers: true,
  });
  const gadgetContext = await loadGadgetContext({
    apiMessages,
    attachedRefs: options.attachedRefs,
    workspaceId: options.workspaceId,
  });
  return {
    apiMessages,
    // Offline answers stay readable on the device.
    localMessages: toLocalModelMessages(
      toApiMessages(options.messages, { hideOfflineAnswers: false }),
      gadgetContext,
    ),
    hostedChatMessages: toHostedChatMessages(apiMessages),
    gadgetContext,
    mentionCount: options.isAgentTurn
      ? ChatMentionToken.refsFromText(getLastQuestionFromMessages(apiMessages))
          .length
      : undefined,
    questionLabel: getLastQuestionFromMessages(
      apiMessages,
      buildLocalGadgetName(gadgetContext),
    ),
  };
}

/**
 * Runs a turn with the data agent on any page. The agent, and the code
 * that reads the page, load on first use so they stay out of the main
 * bundle. The case designer keeps today's chat until case management
 * moves into the agent.
 */
export async function runAgentTurn(
  options: Readonly<RunAgentTurnOptions>,
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
export async function recoverFromChatFailure(
  options: Readonly<RecoverFromChatFailureOptions>,
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

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/**
 * Handles a failed agent turn like `recoverFromChatFailure`, except for its
 * last step: a failure that would be rethrown becomes a reply instead, so
 * the chat never shows a turn with no content. A refused role gets the
 * access message, and anything else (including a declined or unavailable
 * offline offer) says the assistant could not answer. A chat reset still
 * ends the turn quietly, and a stopped turn is still rethrown.
 */
export async function recoverFromAgentFailure(
  options: Readonly<Parameters<typeof recoverFromChatFailure>[0]>,
): Promise<ChatModelRunResult> {
  try {
    return await recoverFromChatFailure(options);
  } catch (error) {
    if (options.isGenerationStale()) {
      return { content: [] };
    }
    if (isAbortError(error)) {
      throw error;
    }
    const text = isAgentAccessDenied(error)
      ? options.copy.agentAccessDenied
      : options.copy.agentUnavailable;
    return { content: [{ type: "text", text }] };
  }
}
