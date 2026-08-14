import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CHAT_MODEL_LOCAL_STORAGE_KEY,
  ChatModelStorage,
} from "@/components/ChatPanel/ChatModelStorage/ChatModelStorage";

const DEFAULT_MODEL_ID = ChatModelOption.Catalog.defaultId;

describe("chatModelStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips the selected model id", () => {
    ChatModelStorage.writeStoredChatModelId("z-ai/glm-5.2");
    expect(window.localStorage.getItem(CHAT_MODEL_LOCAL_STORAGE_KEY)).toBe(
      "z-ai/glm-5.2",
    );
  });

  it("uses the stored model when it is still available", () => {
    const modelId = ChatModelStorage.resolveChatModelId({
      availableModels: [{ id: DEFAULT_MODEL_ID }, { id: "z-ai/glm-5.2" }],
      selectedModelId: "z-ai/glm-5.2",
    });
    expect(modelId).toBe("z-ai/glm-5.2");
  });

  it("falls back to the default when the stored id is stale", () => {
    // A user who picked openai/gpt-5.4 before the catalog shrank lands here.
    expect(
      ChatModelStorage.resolveChatModelId({
        availableModels: [{ id: DEFAULT_MODEL_ID }],
        selectedModelId: "openai/gpt-5.4",
      }),
    ).toBe(DEFAULT_MODEL_ID);
  });

  it("falls back to the default when storage is empty", () => {
    expect(
      ChatModelStorage.resolveChatModelId({
        availableModels: [{ id: DEFAULT_MODEL_ID }],
        selectedModelId: undefined,
      }),
    ).toBe(DEFAULT_MODEL_ID);
  });

  it("falls back to the first available model when the default is missing", () => {
    // The offline-only case: the user has a downloaded local model and no
    // cloud default in the list.
    expect(
      ChatModelStorage.resolveChatModelId({
        availableModels: [{ id: "offline:qwen-1.5b" }],
        selectedModelId: undefined,
      }),
    ).toBe("offline:qwen-1.5b");
  });
});
