import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CHAT_MODEL_LOCAL_STORAGE_KEY,
  ChatModelStorage,
} from "@/components/ChatPanel/ChatModelStorage/ChatModelStorage";

describe("chatModelStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips the selected model id", () => {
    ChatModelStorage.writeStoredChatModelId("anthropic/claude-3.5-sonnet");
    expect(window.localStorage.getItem(CHAT_MODEL_LOCAL_STORAGE_KEY)).toBe(
      "anthropic/claude-3.5-sonnet",
    );
  });

  it("uses the stored model when it is still available", () => {
    const modelId = ChatModelStorage.resolveChatModelId({
      availableModels: [
        { id: GlobalAppConfig.chat.defaultModelId },
        { id: "anthropic/claude-3.5-sonnet" },
      ],
      selectedModelId: "anthropic/claude-3.5-sonnet",
    });
    expect(modelId).toBe("anthropic/claude-3.5-sonnet");
  });

  it("honors a stored id that is not in the catalog yet when requested", () => {
    const modelId = ChatModelStorage.resolveChatModelId({
      availableModels: [{ id: "offline:qwen-1.5b" }],
      storedModelId: "anthropic/claude-3.5-sonnet",
      honorStoredWhenMissing: true,
    });
    expect(modelId).toBe("anthropic/claude-3.5-sonnet");
  });

  it("falls back to the default when storage is empty or stale", () => {
    expect(
      ChatModelStorage.resolveChatModelId({
        availableModels: [{ id: GlobalAppConfig.chat.defaultModelId }],
        selectedModelId: "removed/vendor-model",
      }),
    ).toBe(GlobalAppConfig.chat.defaultModelId);

    expect(
      ChatModelStorage.resolveChatModelId({
        availableModels: [{ id: "vendor/only-model" }],
        selectedModelId: undefined,
      }),
    ).toBe("vendor/only-model");
  });
});
