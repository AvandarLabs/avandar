import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLocalChatModelDownloaded,
  markLocalChatModelDownloaded,
} from "./localChatModelStore";
import { resolveOfflineChatMode } from "./resolveOfflineChatMode";

describe("resolveOfflineChatMode", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_FEATURE_FLAGS", "enable-offline-chat");
    markLocalChatModelDownloaded("qwen-1.5b");
  });

  afterEach(() => {
    clearLocalChatModelDownloaded("qwen-1.5b");
    vi.unstubAllEnvs();
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

  it("stays on cloud when flag disabled", () => {
    vi.stubEnv("VITE_FEATURE_FLAGS", "");
    expect(resolveOfflineChatMode({ navigatorOnLine: false })).toEqual({
      kind: "cloud",
    });
  });
});
