/**
 * Behavioral tests for resizing a live MapLibre map when its viewport or
 * canvas container changes size, including when a docked drawer shrinks the
 * map without a window resize.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useMapWindowResize } from "@/views/GisApp/MapCanvas/useMapWindowResize/useMapWindowResize";
import type { RefObject } from "react";

class TestResizeObserver {
  static onResize: (() => void) | undefined;
  static observedElements = new Set<Element>();

  constructor(onResize: () => void) {
    TestResizeObserver.onResize = onResize;
  }

  observe(element: Element): void {
    TestResizeObserver.observedElements.add(element);
  }

  disconnect(): void {
    TestResizeObserver.observedElements.clear();
  }
}

function _mapRef(): RefObject<
  { resize: ReturnType<typeof vi.fn> } | undefined
> {
  return { current: { resize: vi.fn() } };
}

describe("useMapWindowResize", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    TestResizeObserver.onResize = undefined;
    TestResizeObserver.observedElements.clear();
  });

  it("resizes the map when its canvas container changes size", () => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    const mapRef = _mapRef();
    const container = document.createElement("div");
    const containerRef = { current: container };

    renderHook(() => {
      return useMapWindowResize(mapRef, containerRef);
    });

    expect(TestResizeObserver.observedElements).toEqual(new Set([container]));
    act(() => {
      TestResizeObserver.onResize?.();
    });
    expect(mapRef.current?.resize).toHaveBeenCalledOnce();
  });
});
