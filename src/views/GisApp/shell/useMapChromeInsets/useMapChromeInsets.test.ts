import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useMapChromeInsets } from "@/views/GisApp/shell/useMapChromeInsets/useMapChromeInsets";

class TestResizeObserver {
  static onResize: (() => void) | undefined;
  static observedElements = new Set<Element>();

  constructor(onResize: () => void) {
    TestResizeObserver.onResize = onResize;
  }

  observe(element: Element): void {
    TestResizeObserver.observedElements.add(element);
  }

  disconnect(): void {}
}

describe("useMapChromeInsets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    TestResizeObserver.onResize = undefined;
    TestResizeObserver.observedElements.clear();
  });

  it("starts with safe gutters and a fixed bottom clearance", () => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    const { result } = renderHook(() => {
      return useMapChromeInsets();
    });

    expect(result.current.insetsRef.current).toEqual({
      top: 24,
      right: 24,
      bottom: 88,
      left: 24,
    });
  });

  it("updates top and side padding when observed chrome resizes", () => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    const { result } = renderHook(() => {
      return useMapChromeInsets();
    });
    const topBar = document.createElement("div");
    const leftColumn = document.createElement("div");
    const rightColumn = document.createElement("div");
    Object.defineProperty(topBar, "offsetHeight", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(leftColumn, "offsetWidth", {
      configurable: true,
      value: 280,
    });
    Object.defineProperty(rightColumn, "offsetWidth", {
      configurable: true,
      value: 360,
    });
    act(() => {
      result.current.topBarRef(topBar);
      result.current.leftColumnRef(leftColumn);
      result.current.rightColumnRef(rightColumn);
    });

    expect(result.current.insetsRef.current).toEqual({
      top: 144,
      right: 384,
      bottom: 88,
      left: 304,
    });
    expect(TestResizeObserver.observedElements).toEqual(
      new Set([topBar, leftColumn, rightColumn]),
    );
  });

  it("measures chrome immediately when callback refs mount after the effect", () => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    const { result } = renderHook(() => {
      return useMapChromeInsets();
    });
    const topBar = document.createElement("div");
    Object.defineProperty(topBar, "offsetHeight", {
      configurable: true,
      value: 120,
    });

    act(() => {
      result.current.topBarRef(topBar);
    });

    expect(result.current.insetsRef.current.top).toBe(144);
    expect(TestResizeObserver.observedElements).toContain(topBar);
  });
});
