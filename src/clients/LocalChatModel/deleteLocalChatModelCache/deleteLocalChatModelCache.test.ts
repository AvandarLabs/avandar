import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteLocalChatModelCache } from "@/clients/LocalChatModel/deleteLocalChatModelCache/deleteLocalChatModelCache";

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

  it("calls WebLLM cache delete with the catalog MLC model id", async () => {
    await deleteLocalChatModelCache("qwen-1.5b");

    expect(deleteModelAllInfoInCacheMock).toHaveBeenCalledWith(
      "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    );
  });
});
