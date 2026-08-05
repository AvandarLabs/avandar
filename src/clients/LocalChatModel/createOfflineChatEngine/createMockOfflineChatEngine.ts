import { prop } from "@utils";
import type {
  OfflineChatCompletionRequest,
  OfflineChatEngine,
} from "../offlineChat.types";

export type MockOfflineChatResponse = {
  match: RegExp | string;
  response: string;
};

declare global {
  interface Window {
    __AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__?: readonly MockOfflineChatResponse[];
  }
}

function resolveMockScript(
  fallback: readonly MockOfflineChatResponse[],
): readonly MockOfflineChatResponse[] {
  if (typeof window !== "undefined") {
    const dynamic = window.__AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__;
    if (dynamic && dynamic.length > 0) {
      return dynamic;
    }
  }
  return fallback;
}

/**
 * Deterministic offline engine for Vitest and Playwright. Matches the first
 * `match` against the last user/system message content in the request.
 */
export function createMockOfflineChatEngine(
  scripted: readonly MockOfflineChatResponse[],
): OfflineChatEngine {
  return {
    async preload(): Promise<void> {
      // no-op
    },
    async complete(request: OfflineChatCompletionRequest): Promise<string> {
      const blob = request.messages.map(prop("content")).join("\n");
      const matchingEntry = resolveMockScript(scripted).find((entry) => {
        return typeof entry.match === "string" ?
            blob.includes(entry.match)
          : entry.match.test(blob);
      });
      if (matchingEntry) {
        if (request.onToken) {
          [...matchingEntry.response].forEach(request.onToken);
        }
        return matchingEntry.response;
      }
      return '{"summary":"Mock fallback","proceed":true}';
    },
    async unload(): Promise<void> {
      // no-op
    },
  };
}
