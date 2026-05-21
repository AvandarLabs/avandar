import { afterEach, describe, expect, it } from "vitest";
import {
  clearLocalChatModelDownloaded,
  listDownloadedLocalChatModelIds,
  markLocalChatModelDownloaded,
} from "./localChatModelStore";

describe("localChatModelStore", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("listDownloadedLocalChatModelIds returns catalog order", () => {
    markLocalChatModelDownloaded("llama-1b");
    markLocalChatModelDownloaded("qwen-1.5b");

    expect(listDownloadedLocalChatModelIds()).toEqual([
      "llama-1b",
      "qwen-1.5b",
    ]);
  });

  it("listDownloadedLocalChatModelIds omits cleared models", () => {
    markLocalChatModelDownloaded("qwen-1.5b");
    clearLocalChatModelDownloaded("qwen-1.5b");

    expect(listDownloadedLocalChatModelIds()).toEqual([]);
  });
});
