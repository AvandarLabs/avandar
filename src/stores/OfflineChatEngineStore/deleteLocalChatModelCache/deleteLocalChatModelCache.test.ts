import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteLocalChatModelCache } from "@/stores/OfflineChatEngineStore/deleteLocalChatModelCache/deleteLocalChatModelCache";

const deleteModelAllInfoInCacheMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@mlc-ai/web-llm", () => {
  return {
    deleteModelAllInfoInCache: deleteModelAllInfoInCacheMock,
  };
});

describe("deleteLocalChatModelCache", () => {
  afterEach(() => {
    deleteModelAllInfoInCacheMock.mockClear();
  });

  it("deletes the WebLLM cache entry for the given model id", async () => {
    await deleteLocalChatModelCache("Qwen3-4B-q4f16_1-MLC");

    expect(deleteModelAllInfoInCacheMock).toHaveBeenCalledWith(
      "Qwen3-4B-q4f16_1-MLC",
    );
  });
});
