import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalChatModelStore } from "./LocalChatModelStore/LocalChatModelStore";
import { OfflineChatPickerModels } from "./offlineChatPickerModels";
import { resolveOfflineChatMode } from "./resolveOfflineChatMode";

describe("resolveOfflineChatMode", () => {
  beforeEach(() => {
    LocalChatModelStore.markDownloaded("qwen-1.5b");
  });

  afterEach(() => {
    LocalChatModelStore.clearDownloaded("qwen-1.5b");
  });

  it("uses local when offline and model downloaded", () => {
    expect(resolveOfflineChatMode({ navigatorOnLine: false })).toEqual({
      kind: "local",
    });
  });

  it("offers fallback when online, post failed, model downloaded", () => {
    expect(
      resolveOfflineChatMode({
        navigatorOnLine: true,
        chatPostFailed: true,
      }),
    ).toEqual({ kind: "offer_local_fallback" });
  });

  it("stays on cloud when offline but no model is downloaded", () => {
    LocalChatModelStore.clearDownloaded("qwen-1.5b");
    expect(resolveOfflineChatMode({ navigatorOnLine: false })).toEqual({
      kind: "cloud",
    });
  });

  it("uses local when online and an offline model is selected in the picker", () => {
    expect(
      resolveOfflineChatMode({
        navigatorOnLine: true,
        selectedChatModelId: OfflineChatPickerModels.buildModelId("qwen-1.5b"),
      }),
    ).toEqual({ kind: "local", localChatModelId: "qwen-1.5b" });
  });

  it("stays on cloud when online with a cloud model selected", () => {
    expect(
      resolveOfflineChatMode({
        navigatorOnLine: true,
        selectedChatModelId: "anthropic/claude-3.5-sonnet",
      }),
    ).toEqual({ kind: "cloud" });
  });
});
