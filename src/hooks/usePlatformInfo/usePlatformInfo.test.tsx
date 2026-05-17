import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePlatformInfo } from "@/hooks/usePlatformInfo/usePlatformInfo";

describe("usePlatformInfo", () => {
  afterEach(() => {
    delete document.documentElement.dataset.avaPlatform;
  });

  it("returns 'web' when no platform marker is set", () => {
    const { result } = renderHook(() => {
      return usePlatformInfo();
    });
    expect(result.current).toBe("web");
  });

  it("returns 'desktop' when the platform marker is set before render", () => {
    document.documentElement.dataset.avaPlatform = "desktop";
    const { result } = renderHook(() => {
      return usePlatformInfo();
    });
    expect(result.current).toBe("desktop");
  });

  it("transitions from 'web' to 'desktop' when the marker is added after render", async () => {
    const { result } = renderHook(() => {
      return usePlatformInfo();
    });
    expect(result.current).toBe("web");

    await act(async () => {
      document.documentElement.dataset.avaPlatform = "desktop";
      await Promise.resolve();
    });

    expect(result.current).toBe("desktop");
  });
});
