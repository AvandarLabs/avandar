import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOfflineGate } from "@/lib/offline/useOfflineGate";

vi.mock("@ui", () => ({
  notifyError: vi.fn(),
}));

describe("useOfflineGate", () => {
  afterEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("is not blocked when online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const { result } = renderHook(() => useOfflineGate("offline reason"));
    expect(result.current.isBlocked).toBe(false);
  });

  it("is blocked when offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderHook(() => useOfflineGate("offline reason"));
    expect(result.current.isBlocked).toBe(true);
    expect(result.current.tooltip).toBe("offline reason");
  });

  it("guard short-circuits when offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderHook(() => useOfflineGate());
    const fn = vi.fn();
    const guarded = result.current.guard(fn);
    guarded();
    expect(fn).not.toHaveBeenCalled();
  });

  it("guard calls through when online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const { result } = renderHook(() => useOfflineGate());
    const fn = vi.fn();
    result.current.guard(fn)();
    expect(fn).toHaveBeenCalledOnce();
  });
});
