import { chatMessagesKey } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { AgentAskRecord } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";

/**
 * How a turn's thread relates to the thread its conversation was last
 * asked. `first`: no ask has settled. `continues`: the thread adds messages
 * after the recorded one (a follow-up, a card answer, a view change).
 * `same_thread`: the recorded thread again, which assistant-ui sends on Try
 * again of the latest answer. `rewound`: anything else, such as Try again
 * on an earlier answer.
 */
export type AgentTurnKind = "first" | "continues" | "same_thread" | "rewound";

/**
 * Classifies a turn against its conversation's last ask. Two threads match
 * only when every message's role and text match, so only a thread
 * assistant-ui reran repeats exactly.
 */
export function getAgentTurnKind(
  options: Readonly<{
    lastAsk: AgentAskRecord | undefined;
    apiMessages: readonly ChatClientMessage.T[];
  }>,
): AgentTurnKind {
  const { lastAsk, apiMessages } = options;
  if (lastAsk === undefined) {
    return "first";
  }
  if (apiMessages.length < lastAsk.messageCount) {
    return "rewound";
  }
  const startKey = chatMessagesKey(apiMessages.slice(0, lastAsk.messageCount));
  if (startKey !== lastAsk.threadKey) {
    return "rewound";
  }
  return apiMessages.length === lastAsk.messageCount
    ? "same_thread"
    : "continues";
}
