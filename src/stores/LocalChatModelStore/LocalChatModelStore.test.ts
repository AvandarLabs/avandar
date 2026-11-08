import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { LocalChatModelStore } from "./LocalChatModelStore";

const BUNDLE_IDS = LocalChatModel.getModelIdsFromBundle(
  LocalChatModel.OFFLINE_BUNDLE,
);

describe("LocalChatModelStore", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("reports the bundle downloaded once every bundle model is marked", () => {
    expect(LocalChatModelStore.isBundleDownloaded()).toBe(false);
    BUNDLE_IDS.forEach(LocalChatModelStore.markDownloaded);
    expect(LocalChatModelStore.isBundleDownloaded()).toBe(true);
  });

  it("reports the bundle missing when one bundle model is cleared", () => {
    BUNDLE_IDS.forEach(LocalChatModelStore.markDownloaded);
    LocalChatModelStore.clearDownloaded(BUNDLE_IDS[0]!);
    expect(LocalChatModelStore.isBundleDownloaded()).toBe(false);
  });

  it("ignores markers for models that are no longer in the catalog", () => {
    window.localStorage.setItem(
      "avandar.offlineChat.downloadedModels",
      JSON.stringify({ "qwen-1.5b": true }),
    );
    expect(LocalChatModelStore.isBundleDownloaded()).toBe(false);
  });

  it("notifies subscribers when a model is marked or cleared", () => {
    const listener = vi.fn();
    const unsubscribe = LocalChatModelStore.subscribeDownloadedModels(listener);
    LocalChatModelStore.markDownloaded(BUNDLE_IDS[0]!);
    LocalChatModelStore.clearDownloaded(BUNDLE_IDS[0]!);
    unsubscribe();
    LocalChatModelStore.markDownloaded(BUNDLE_IDS[0]!);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
