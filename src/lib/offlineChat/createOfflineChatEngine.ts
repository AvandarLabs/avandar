import { createMockOfflineChatEngine } from "./createMockOfflineChatEngine";
import { createWebLLMOfflineChatEngine } from "./createWebLLMOfflineChatEngine";
import { isOfflineChatMockForced } from "./isOfflineChatEnabled";
import type { MockOfflineChatResponse } from "./createMockOfflineChatEngine";
import type { LocalChatModelId } from "./localChatModelCatalog";
import type { OfflineChatEngine } from "./offlineChat.types";

declare global {
  interface Window {
    __AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__?: readonly MockOfflineChatResponse[];
  }
}

export function createOfflineChatEngine(args: {
  modelId: LocalChatModelId;
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

  return createWebLLMOfflineChatEngine({
    modelId: args.modelId,
    onDownloadProgress: args.onDownloadProgress,
  });
}
