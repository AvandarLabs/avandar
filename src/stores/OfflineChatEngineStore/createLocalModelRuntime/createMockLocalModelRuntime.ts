import { prop } from "@avandar/utils";
import type { LocalModelRuntime } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/createLocalModelRuntime";

export type MockOfflineChatResponse = {
  match: RegExp | string;
  response: string;
};

declare global {
  interface Window {
    __AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__?: readonly MockOfflineChatResponse[];
  }
}

function _getMockScript(
  fallback: readonly MockOfflineChatResponse[],
): readonly MockOfflineChatResponse[] {
  const dynamic =
    typeof window !== "undefined"
      ? window.__AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__
      : undefined;
  return dynamic && dynamic.length > 0 ? dynamic : fallback;
}

/**
 * Deterministic local model runtime for Vitest and Playwright. Answers with
 * the first scripted response whose `match` appears in the request's
 * messages, read fresh from `window.__AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__` on
 * every request so a test can change the script between turns.
 */
export function createMockLocalModelRuntime(
  scripted: readonly MockOfflineChatResponse[],
): LocalModelRuntime {
  return {
    load: async (_modelId, onProgress) => {
      onProgress?.(1);
    },
    complete: async (request) => {
      const blob = request.messages.map(prop("content")).join("\n");
      const matchingEntry = _getMockScript(scripted).find((entry) => {
        return typeof entry.match === "string"
          ? blob.includes(entry.match)
          : entry.match.test(blob);
      });
      const text =
        matchingEntry?.response ?? '{"summary":"Mock fallback","proceed":true}';
      if (request.onToken) {
        [...text].forEach(request.onToken);
      }
      return { text, promptTokens: 0, completionTokens: 0 };
    },
    unload: async () => {
      // Nothing is resident.
    },
    deleteFromCache: async () => {
      // Nothing is cached.
    },
  };
}
