import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { createConversationAgentHost } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost";
import {
  askConversationDataAgent,
  loadDataAgentDatasets,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import { createOfflineDataAgent } from "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent";
import { OFFLINE_CHAT_CONTEXT_WINDOW_SIZE } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/offlineChatContextWindow";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";
import type { AgentConversationState } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost";
import type {
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { ChatModelRunResult } from "@assistant-ui/react";

/** One offline conversation per chat, so follow-ups see earlier turns. */
const offlineConversationsByChat = new Map<string, DataAgentConversation>();

/**
 * The host must hold the same object the conversation map keeps, since
 * `askConversationDataAgent` updates its turn and results in place.
 */
async function _createOfflineConversation(
  turnRef: AgentConversationState["turnRef"],
): Promise<DataAgentConversation> {
  const conversation = {
    turnRef,
    results: [],
  } as unknown as DataAgentConversation;
  conversation.dataAgent = createOfflineDataAgent({
    datasets: await loadDataAgentDatasets(turnRef.current.workspaceId),
    host: {
      ...createConversationAgentHost(conversation),
      // The model runs on this device, so values never cross a boundary and
      // there is nothing to ask consent for.
      approveValuesForModel: async () => {
        return true;
      },
    },
    llm: OfflineChatEngineStore,
    models: LocalChatModel.OFFLINE_BUNDLE,
    contextWindow: OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
    today: new Date().toISOString().slice(0, 10),
  });
  return conversation;
}

/**
 * Answers a Data Explorer chat message in offline mode with the offline data
 * agent: the same Pi agent and conversation host as `runDataAgentTurn`, with
 * every model call answered by the offline models in this browser. Offline
 * turns carry no page context, so results always go to the Data Explorer.
 * Nothing the user asks or any of their data leaves the device.
 */
export async function runOfflineDataAgentTurn(
  options: Readonly<DataAgentTurnOptions>,
): Promise<ChatModelRunResult> {
  return askConversationDataAgent({
    conversations: offlineConversationsByChat,
    turn: options,
    createConversation: _createOfflineConversation,
  });
}
