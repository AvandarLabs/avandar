import { chatMessagesKey } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { AgentAskRecord } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";

/**
 * How a turn's user messages relate to those of the thread its conversation
 * was last asked. `first`: no ask has settled. `continues`: the thread adds
 * user messages after the recorded ones (a follow-up, a card answer, a view
 * change). `same_thread`: the recorded user messages again, which
 * assistant-ui sends on Try again of the latest answer. `rewound`: anything
 * else, such as Try again on an earlier answer.
 */
export type AgentTurnKind = "first" | "continues" | "same_thread" | "rewound";

function _userMessages(
  apiMessages: readonly ChatClientMessage.T[],
): ChatClientMessage.T[] {
  return apiMessages.filter((message) => {
    return message.role === "user";
  });
}

/**
 * The record of one ask: its thread's user messages, and how it ended.
 * Assistant messages are left out because a run a newer message stopped can
 * fill in its reply after the newer turn was sent without it.
 */
export function createAgentAskRecord(
  options: Readonly<{
    apiMessages: readonly ChatClientMessage.T[];
    isKept: boolean;
  }>,
): AgentAskRecord {
  const userMessages = _userMessages(options.apiMessages);
  return {
    threadKey: chatMessagesKey(userMessages),
    messageCount: userMessages.length,
    isKept: options.isKept,
  };
}

/**
 * Classifies a turn against its conversation's last ask, by user messages
 * only. Two threads match only when every user message's text matches, so
 * only a thread assistant-ui reran repeats exactly.
 */
export function getAgentTurnKind(
  options: Readonly<{
    lastAsk: AgentAskRecord | undefined;
    apiMessages: readonly ChatClientMessage.T[];
  }>,
): AgentTurnKind {
  const { lastAsk } = options;
  if (lastAsk === undefined) {
    return "first";
  }
  const userMessages = _userMessages(options.apiMessages);
  if (userMessages.length < lastAsk.messageCount) {
    return "rewound";
  }
  const startKey = chatMessagesKey(userMessages.slice(0, lastAsk.messageCount));
  if (startKey !== lastAsk.threadKey) {
    return "rewound";
  }
  return userMessages.length === lastAsk.messageCount
    ? "same_thread"
    : "continues";
}
