/**
 * The WebLLM runtime behind offline chat, driven through a fake engine so no
 * weights load: the context window it asks for, how it swaps models, and
 * what each completion request asks WebLLM for.
 */
import { describe, expect, it, vi } from "vitest";
import { createWebLlmModelRuntime } from "./createWebLlmModelRuntime";
import {
  estimateQwen3FourBKvCacheBytes,
  OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
} from "./offlineChatContextWindow";
import type { WebLlmEngine } from "./createWebLlmModelRuntime";

function _createFakeEngine(): WebLlmEngine & {
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async (input: { stream?: boolean }) => {
    if (input.stream) {
      return (async function* () {
        yield { choices: [{ delta: { content: "he" } }] };
        yield { choices: [{ delta: { content: "llo" } }] };
      })();
    }
    return {
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 12, completion_tokens: 3 },
    };
  });
  return {
    create,
    reload: vi.fn().mockResolvedValue(undefined),
    unload: vi.fn().mockResolvedValue(undefined),
    setInitProgressCallback: vi.fn(),
    chat: { completions: { create } },
  };
}

describe("offlineChatContextWindow", () => {
  it("costs 576 MiB of Qwen3-4B KV cache over WebLLM's 4096 default", () => {
    const atDefault = estimateQwen3FourBKvCacheBytes(4096);
    const atRaised = estimateQwen3FourBKvCacheBytes(
      OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
    );
    expect((atRaised - atDefault) / (1024 * 1024)).toBeCloseTo(576, 0);
  });
});

describe("createWebLlmModelRuntime", () => {
  it("loads a model with the raised context window", async () => {
    const engine = _createFakeEngine();
    const runtime = createWebLlmModelRuntime({
      createEngine: async () => {
        return engine;
      },
    });

    await runtime.load("Qwen3-4B-q4f16_1-MLC");

    expect(engine.reload).toHaveBeenCalledWith("Qwen3-4B-q4f16_1-MLC", {
      context_window_size: OFFLINE_CHAT_CONTEXT_WINDOW_SIZE,
    });
  });

  it("reports download progress between 0 and 1 while loading", async () => {
    const engine = _createFakeEngine();
    engine.reload = vi.fn(async () => {
      const callback = vi.mocked(engine.setInitProgressCallback).mock
        .calls[0]![0]!;
      callback({ progress: 0.5, text: "", timeElapsed: 0 });
    });
    const onProgress = vi.fn();
    const runtime = createWebLlmModelRuntime({
      createEngine: async () => {
        return engine;
      },
    });

    await runtime.load("Qwen3-4B-q4f16_1-MLC", onProgress);

    expect(onProgress).toHaveBeenCalledWith(0.5);
  });

  it("constrains a reply to the request's JSON Schema with thinking off", async () => {
    const engine = _createFakeEngine();
    const runtime = createWebLlmModelRuntime({
      createEngine: async () => {
        return engine;
      },
    });
    const jsonSchema = { type: "object" };

    const completion = await runtime.complete({
      modelId: "Qwen3-4B-q4f16_1-MLC",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 64,
      jsonSchema,
    });

    expect(engine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 64,
        temperature: 0,
        response_format: {
          type: "json_object",
          schema: JSON.stringify(jsonSchema),
        },
        extra_body: { enable_thinking: false },
      }),
    );
    expect(completion).toEqual({
      text: "ok",
      promptTokens: 12,
      completionTokens: 3,
    });
  });

  it("streams each token to onToken and returns the joined text", async () => {
    const engine = _createFakeEngine();
    const runtime = createWebLlmModelRuntime({
      createEngine: async () => {
        return engine;
      },
    });
    const tokens: string[] = [];

    const completion = await runtime.complete({
      modelId: "Qwen3-4B-q4f16_1-MLC",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 64,
      onToken: (delta) => {
        tokens.push(delta);
      },
    });

    expect(tokens).toEqual(["he", "llo"]);
    expect(completion.text).toBe("hello");
  });
});
