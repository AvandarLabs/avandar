import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import {
  buildAgentTurnInputs,
  readAgentPageContext,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/buildAgentTurnInputs";
import { createAgentConversation } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/createConversationAgentHost";
import {
  askConversationDataAgent,
  buildConversationKey,
  loadDataAgentDatasets,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import { createOfflineDataAgent } from "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent";
import { OFFLINE_CHAT_CONTEXT_WINDOW_SIZE } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/offlineChatContextWindow";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentPageInputs } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/buildAgentTurnInputs";
import type {
  AgentConversationState,
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { ChatModelRunResult } from "@assistant-ui/react";

/** One offline conversation per chat, so follow-ups see earlier turns. */
const offlineConversationsByChat = new Map<string, DataAgentConversation>();

function _createOfflineConversation(
  turnRef: AgentConversationState["turnRef"],
  datasets: readonly DataAgentDataset[],
): DataAgentConversation {
  return createAgentConversation({
    turnRef,
    datasets,
    createDataAgent: (host) => {
      return createOfflineDataAgent({
        datasets,
        host: {
          ...host,
          // The model runs on this device, so values never cross a boundary
          // and there is nothing to ask consent for.
          approveValuesForModel: async () => {
            return true;
          },
        },
        llm: OfflineChatEngineStore,
        models: LocalChatModel.OFFLINE_BUNDLE,
        contextWindow: OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
        today: new Date().toISOString().slice(0, 10),
      });
    },
  });
}

/**
 * Answers a chat message on any page with the offline data agent: the same
 * Pi agent and conversation host as `runDataAgentTurn`, with every model
 * call answered by the offline models in this browser. The page, the tray,
 * and the message's mentions start the turn with real names. Results go to
 * the Data Explorer on that page and to the chat elsewhere. Nothing the
 * user asks or any of their data leaves the device.
 */
export async function runOfflineDataAgentTurn(
  options: Readonly<DataAgentTurnOptions>,
  page?: Readonly<AgentPageInputs>,
): Promise<ChatModelRunResult> {
  const existing = offlineConversationsByChat.get(
    buildConversationKey(options),
  );
  const datasets =
    existing?.datasets ?? (await loadDataAgentDatasets(options.workspaceId));
  const pageContext = page
    ? await readAgentPageContext(page, datasets, options.workspaceId)
    : undefined;
  return askConversationDataAgent({
    conversations: offlineConversationsByChat,
    turn: { ...options, isOffline: true, pageContext },
    onConversationReady: (conversation) => {
      if (options.titleMaskRef) {
        options.titleMaskRef.current = conversation.sqlVault.maskText;
      }
    },
    buildTurnInputs: (conversation) => {
      return buildAgentTurnInputs({
        conversation,
        datasets,
        pageContext,
        turn: options,
        privacy: "device",
      });
    },
    createConversation: async (turnRef) => {
      return _createOfflineConversation(turnRef, datasets);
    },
  });
}
