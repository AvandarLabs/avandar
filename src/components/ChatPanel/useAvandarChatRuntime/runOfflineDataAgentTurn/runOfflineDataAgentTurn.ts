import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import {
  askConversationDataAgent,
  createExplorerDataAgentHost,
  loadDataAgentDatasets,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import { createOfflineDataAgent } from "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent";
import { OFFLINE_CHAT_CONTEXT_WINDOW_SIZE } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/offlineChatContextWindow";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { DataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { ChatModelRunResult } from "@assistant-ui/react";

/** One offline agent per conversation, so follow-ups see earlier turns. */
const offlineAgentsByConversation = new Map<string, DataAgent>();

async function _createOfflineAgent(
  options: Readonly<DataAgentTurnOptions>,
): Promise<DataAgent> {
  return createOfflineDataAgent({
    datasets: await loadDataAgentDatasets(options.workspaceId),
    host: {
      ...createExplorerDataAgentHost(options),
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
}

/**
 * Answers a Data Explorer chat message in offline mode with the offline data
 * agent: the same Pi agent and Data Explorer host as `runDataAgentTurn`, with
 * every model call answered by the offline models in this browser. Nothing
 * the user asks or any of their data leaves the device.
 */
export async function runOfflineDataAgentTurn(
  options: Readonly<DataAgentTurnOptions>,
): Promise<ChatModelRunResult> {
  return askConversationDataAgent({
    agents: offlineAgentsByConversation,
    turn: options,
    createAgent: () => {
      return _createOfflineAgent(options);
    },
  });
}
