import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertWhisperCppCanRun,
  isWhisperCppCrossOriginIsolated,
} from "./assertWhisperCppCanRun";

describe("assertWhisperCppCanRun", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when the page is not cross-origin isolated", () => {
    vi.stubGlobal("crossOriginIsolated", false);
    expect(() => {
      assertWhisperCppCanRun();
    }).toThrow(/cross-origin isolated/i);
  });

  it("does not throw when cross-origin isolated", () => {
    vi.stubGlobal("crossOriginIsolated", true);
    expect(() => {
      assertWhisperCppCanRun();
    }).not.toThrow();
    expect(isWhisperCppCrossOriginIsolated()).toBe(true);
  });
});
