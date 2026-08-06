import { getIsMacPlatform } from "@browser-utils/getIsMacPlatform/getIsMacPlatform";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getIsMacPlatform", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses userAgentData.platform when available (Mac)", () => {
    vi.stubGlobal("navigator", {
      userAgentData: { platform: "macOS" },
      userAgent: "irrelevant-windows-string",
    });
    expect(getIsMacPlatform()).toBe(true);
  });

  it("uses userAgentData.platform when available (non-Mac)", () => {
    vi.stubGlobal("navigator", {
      userAgentData: { platform: "Windows" },
      // userAgent would say Mac, but userAgentData takes precedence.
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    expect(getIsMacPlatform()).toBe(false);
  });

  it("detects iOS devices via userAgentData.platform", () => {
    vi.stubGlobal("navigator", {
      userAgentData: { platform: "iPhone" },
      userAgent: "",
    });
    expect(getIsMacPlatform()).toBe(true);
  });

  it("falls back to userAgent when userAgentData is absent", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
    expect(getIsMacPlatform()).toBe(true);
  });

  it("returns false for a non-Mac userAgent fallback", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    expect(getIsMacPlatform()).toBe(false);
  });

  it("returns false when navigator is undefined", () => {
    vi.stubGlobal("navigator", undefined);
    expect(getIsMacPlatform()).toBe(false);
  });
});
