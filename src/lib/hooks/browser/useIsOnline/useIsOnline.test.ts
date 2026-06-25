import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
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
