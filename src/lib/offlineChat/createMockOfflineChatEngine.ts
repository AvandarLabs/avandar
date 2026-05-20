import type {
  OfflineChatCompletionRequest,
  OfflineChatEngine,
} from "./offlineChat.types";

export type MockOfflineChatResponse = {
  match: RegExp | string;
  response: string;
};

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
      const blob = request.messages
        .map((message) => {
          return message.content;
        })
        .join("\n");
      for (const entry of scripted) {
        const matches =
          typeof entry.match === "string" ?
            blob.includes(entry.match)
          : entry.match.test(blob);
        if (matches) {
          if (request.onToken) {
            for (const char of entry.response) {
              request.onToken(char);
            }
          }
          return entry.response;
        }
      }
      return '{"summary":"Mock fallback","proceed":true}';
    },
    async unload(): Promise<void> {
      // no-op
    },
  };
}
