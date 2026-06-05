import { afterEach, describe, expect, it, vi } from "vitest";
import { getIsOnline, useIsOnline } from "@/lib/offline/useIsOnline";
import { renderHook } from "@/test-utils";

describe("useIsOnline", () => {
  afterEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("returns true when navigator.onLine is true", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const { result } = renderHook(() => {
      return useIsOnline();
    });
    expect(result.current).toBe(true);
  });

  it("returns false when navigator.onLine is false", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderHook(() => {
      return useIsOnline();
    });
    expect(result.current).toBe(false);
  });
});

describe("getIsOnline", () => {
  it("reads navigator.onLine", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(getIsOnline()).toBe(false);
  });
});
