import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useIsDesktopPlatform } from "@/hooks/usePlatformInfo/useIsDesktopPlatform/useIsDesktopPlatform";

describe("useIsDesktopPlatform", () => {
  afterEach(() => {
    delete document.documentElement.dataset.avaPlatform;
  });

  it("returns false when the platform marker is absent", () => {
    const { result } = renderHook(() => {
      return useIsDesktopPlatform();
    });
    expect(result.current).toBe(false);
  });

  it("returns true when the platform marker is set before render", () => {
    document.documentElement.dataset.avaPlatform = "desktop";
    const { result } = renderHook(() => {
      return useIsDesktopPlatform();
    });
    expect(result.current).toBe(true);
  });

  it("updates to true when the marker is added after first render", async () => {
    const { result } = renderHook(() => {
      return useIsDesktopPlatform();
    });
    expect(result.current).toBe(false);

    await act(async () => {
      document.documentElement.dataset.avaPlatform = "desktop";
      // MutationObserver callbacks run as microtasks; yield so they flush
      // and the React state update inside the observer commits.
      await Promise.resolve();
    });

    expect(result.current).toBe(true);
  });
});
