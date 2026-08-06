import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { createMockOfflineChatEngine } from "@/stores/OfflineChatEngineStore/createOfflineChatEngine/createMockOfflineChatEngine";
import { createWebLlmOfflineChatEngine } from "@/stores/OfflineChatEngineStore/createOfflineChatEngine/createWebLlmOfflineChatEngine";
import { isOfflineChatMockForced } from "@/stores/OfflineChatEngineStore/createOfflineChatEngine/isOfflineChatMockForced";
import type { MockOfflineChatResponse } from "@/stores/OfflineChatEngineStore/createOfflineChatEngine/createMockOfflineChatEngine";
import type { OfflineChatEngine } from "$/types/offlineChat.types";

/** Creates the configured offline chat engine for production or mock use. */
export function createOfflineChatEngine(args: {
  modelId: LocalChatModel.Id;
  onDownloadProgress?: (report: { text: string; progress: number }) => void;
  mockScript?: readonly MockOfflineChatResponse[];
}): OfflineChatEngine {
  const windowScript =
    typeof window !== "undefined" ?
      window.__AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__
    : undefined;
  const script = args.mockScript ?? windowScript;

  if (isOfflineChatMockForced() || script) {
    return createMockOfflineChatEngine(
      script ?? [
        {
          match: "offline assistant",
          response: '{"summary":"Mock analyze","proceed":true}',
        },
        {
          match: "DuckDB SQL generator",
          response: "Here is the query.\n```sql\nSELECT 1 AS mock_offline\n```",
        },
      ],
    );
  }

  return createWebLlmOfflineChatEngine({
    modelId: args.modelId,
    onDownloadProgress: args.onDownloadProgress,
  });
}
