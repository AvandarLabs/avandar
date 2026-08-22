/**
 * Offline WebLLM context window and the KV-cache cost of raising it.
 */
import { describe, expect, it } from "vitest";

import { createWebLlmOfflineChatEngine } from "@/stores/OfflineChatEngineStore/createOfflineChatEngine/createWebLlmOfflineChatEngine";
import {
  estimateQwen15bKvCacheBytes,
  OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
} from "@/stores/OfflineChatEngineStore/createOfflineChatEngine/offlineChatContextWindow";

describe("offlineChatContextWindow", () => {
  it("raises the window to 8192", () => {
    expect(OFFLINE_CHAT_CONTEXT_WINDOW_SIZE).toBe(8192);
  });

  it("costs 112 MiB of Qwen 1.5B KV cache versus the 4096 default", () => {
    const atDefault = estimateQwen15bKvCacheBytes(4096);
    const atRaised = estimateQwen15bKvCacheBytes(
      OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
    );
    const deltaMib = (atRaised - atDefault) / (1024 * 1024);
    expect(deltaMib).toBeCloseTo(112, 0);
  });
});

describe("createWebLlmOfflineChatEngine", () => {
  it("passes the raised context window into CreateMLCEngine chatOpts", async () => {
    let capturedChatOpts: { context_window_size?: number } | undefined;
    const engine = createWebLlmOfflineChatEngine({
      modelId: "qwen-1.5b",
      factory: async (_mlcModelId, _onProgress, chatOpts) => {
        capturedChatOpts = chatOpts;
        return {
          chat: {
            completions: {
              create: async () => {
                return { choices: [{ message: { content: "ok" } }] };
              },
            },
          },
        };
      },
    });

    await engine.preload();

    expect(capturedChatOpts?.context_window_size).toBe(
      OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
    );
  });
});
