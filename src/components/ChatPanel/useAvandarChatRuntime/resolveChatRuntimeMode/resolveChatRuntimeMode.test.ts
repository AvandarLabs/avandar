import { describe, expect, it } from "vitest";
import { resolveChatRuntimeMode } from "@/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode";

const ONLINE_DEFAULTS = {
  navigatorOnLine: true,
  isOfflineModeOn: false,
  isBundleDownloaded: true,
};

describe("resolveChatRuntimeMode", () => {
  it("uses cloud when online with offline mode off", () => {
    expect(resolveChatRuntimeMode(ONLINE_DEFAULTS)).toEqual({ kind: "cloud" });
  });

  it("uses local when offline mode is on, even while online", () => {
    expect(
      resolveChatRuntimeMode({ ...ONLINE_DEFAULTS, isOfflineModeOn: true }),
    ).toEqual({ kind: "local" });
  });

  it("keeps offline mode local when the bundle markers are gone", () => {
    // The user asked that nothing leave the device, so the turn must not
    // quietly go to the cloud; the local runner explains what is missing.
    expect(
      resolveChatRuntimeMode({
        ...ONLINE_DEFAULTS,
        isOfflineModeOn: true,
        isBundleDownloaded: false,
      }),
    ).toEqual({ kind: "local" });
  });

  it("uses local when the browser is offline and the bundle is downloaded", () => {
    expect(
      resolveChatRuntimeMode({ ...ONLINE_DEFAULTS, navigatorOnLine: false }),
    ).toEqual({ kind: "local" });
  });

  it("stays on cloud when the browser is offline without the bundle", () => {
    expect(
      resolveChatRuntimeMode({
        ...ONLINE_DEFAULTS,
        navigatorOnLine: false,
        isBundleDownloaded: false,
      }),
    ).toEqual({ kind: "cloud" });
  });

  it("offers the offline models when the cloud request failed", () => {
    expect(
      resolveChatRuntimeMode({ ...ONLINE_DEFAULTS, chatPostFailed: true }),
    ).toEqual({ kind: "offer_local_fallback" });
  });

  it("offers nothing when the cloud request failed without the bundle", () => {
    expect(
      resolveChatRuntimeMode({
        ...ONLINE_DEFAULTS,
        chatPostFailed: true,
        isBundleDownloaded: false,
      }),
    ).toEqual({ kind: "cloud" });
  });
});
