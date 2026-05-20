import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearLocalChatModelDownloaded,
  markLocalChatModelDownloaded,
} from "./localChatModelStore";
import { resolveOfflineChatMode } from "./resolveOfflineChatMode";

describe("resolveOfflineChatMode", () => {
  beforeEach(() => {
    markLocalChatModelDownloaded("qwen-1.5b");
  });

  afterEach(() => {
    clearLocalChatModelDownloaded("qwen-1.5b");
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
    clearLocalChatModelDownloaded("qwen-1.5b");
    expect(resolveOfflineChatMode({ navigatorOnLine: false })).toEqual({
      kind: "cloud",
    });
  });
});
