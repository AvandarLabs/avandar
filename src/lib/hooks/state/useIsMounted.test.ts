import { describe, expect, it } from "vitest";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { renderHook } from "@/test-utils";

describe("useIsMounted", () => {
  it("is true while the component is mounted and false after it unmounts", () => {
    const { result, unmount } = renderHook(() => {
      return useIsMounted();
    });
    expect(result.current.current).toBe(true);
    unmount();
    expect(result.current.current).toBe(false);
  });

  it("keeps the same ref across renders, so a late callback reads the latest value", () => {
    const { result, rerender } = renderHook(() => {
      return useIsMounted();
    });
    const firstRef = result.current;
    rerender();
    expect(result.current).toBe(firstRef);
  });
});
