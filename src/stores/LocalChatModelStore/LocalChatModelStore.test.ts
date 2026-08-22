import { afterEach, describe, expect, it } from "vitest";

import { LocalChatModelStore } from "./LocalChatModelStore";

describe("LocalChatModelStore/LocalChatModelStore", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("LocalChatModelStore.listDownloadedIds returns catalog order", () => {
    LocalChatModelStore.markDownloaded("llama-1b");
    LocalChatModelStore.markDownloaded("qwen-1.5b");

    expect(LocalChatModelStore.listDownloadedIds()).toEqual([
      "llama-1b",
      "qwen-1.5b",
    ]);
  });

  it("LocalChatModelStore.listDownloadedIds omits cleared models", () => {
    LocalChatModelStore.markDownloaded("qwen-1.5b");
    LocalChatModelStore.clearDownloaded("qwen-1.5b");

    expect(LocalChatModelStore.listDownloadedIds()).toEqual([]);
  });
});
