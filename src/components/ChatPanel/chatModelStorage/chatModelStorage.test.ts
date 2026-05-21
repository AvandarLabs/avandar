import { AppConfig } from "$/config/AppConfig";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CHAT_MODEL_LOCAL_STORAGE_KEY,
  readStoredChatModelId,
  resolveChatModelId,
  writeStoredChatModelId,
} from "@/components/ChatPanel/chatModelStorage/chatModelStorage";

describe("chatModelStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips the selected model id", () => {
    writeStoredChatModelId("anthropic/claude-3.5-sonnet");
    expect(readStoredChatModelId()).toBe("anthropic/claude-3.5-sonnet");
    expect(window.localStorage.getItem(CHAT_MODEL_LOCAL_STORAGE_KEY)).toBe(
      "anthropic/claude-3.5-sonnet",
    );
  });

  it("uses the stored model when it is still available", () => {
    const modelId = resolveChatModelId({
      availableModels: [
        { id: AppConfig.chat.defaultModelId },
        { id: "anthropic/claude-3.5-sonnet" },
      ],
      storedModelId: "anthropic/claude-3.5-sonnet",
    });
    expect(modelId).toBe("anthropic/claude-3.5-sonnet");
  });

  it("honors a stored id that is not in the catalog yet when requested", () => {
    const modelId = resolveChatModelId({
      availableModels: [{ id: "offline:qwen-1.5b" }],
      storedModelId: "anthropic/claude-3.5-sonnet",
      honorStoredWhenMissing: true,
    });
    expect(modelId).toBe("anthropic/claude-3.5-sonnet");
  });

  it("falls back to the default when storage is empty or stale", () => {
    expect(
      resolveChatModelId({
        availableModels: [{ id: AppConfig.chat.defaultModelId }],
        storedModelId: "removed/vendor-model",
      }),
    ).toBe(AppConfig.chat.defaultModelId);

    expect(
      resolveChatModelId({
        availableModels: [{ id: "vendor/only-model" }],
        storedModelId: undefined,
      }),
    ).toBe("vendor/only-model");
  });
});
