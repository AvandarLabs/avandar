/**
 * Tests for `useHighlightTile`: it finds a linked dashboard tile by its
 * `data-tile-id`, scrolls it into view, and highlights it briefly.
 */
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@/test-utils";
import { useHighlightTile } from "./useHighlightTile";
import classes from "./useHighlightTile.module.css";

function addTile(tileId: string): HTMLElement {
  const tile = document.createElement("div");
  tile.setAttribute("data-tile-id", tileId);
  document.body.appendChild(tile);
  return tile;
}

describe("useHighlightTile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom ships no `CSS` namespace, so `CSS.escape` is stubbed with a
    // pass-through for the plain ids these tests use.
    vi.stubGlobal("CSS", {
      escape: (value: string) => {
        return value;
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("scrolls the tile into view and highlights it briefly", () => {
    const tile = addTile("DataViz-1");
    const scrollIntoView = vi.spyOn(tile, "scrollIntoView");

    renderHook(() => {
      useHighlightTile("DataViz-1");
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "center" }),
    );
    expect(tile).toHaveClass(classes.highlighted!);

    act(() => {
      vi.advanceTimersByTime(2400);
    });
    expect(tile).not.toHaveClass(classes.highlighted!);
  });

  it("waits for a tile that renders after the page", () => {
    renderHook(() => {
      useHighlightTile("DataViz-1");
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const tile = addTile("DataViz-1");
    const scrollIntoView = vi.spyOn(tile, "scrollIntoView");
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollIntoView).toHaveBeenCalled();
    expect(tile).toHaveClass(classes.highlighted!);
  });

  it("ignores an id that matches no tile", () => {
    const tile = addTile("DataViz-1");
    const scrollIntoView = vi.spyOn(tile, "scrollIntoView");

    expect(() => {
      renderHook(() => {
        useHighlightTile("DataViz-missing");
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
    }).not.toThrow();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("does nothing without a tile id", () => {
    const tile = addTile("DataViz-1");
    const scrollIntoView = vi.spyOn(tile, "scrollIntoView");

    renderHook(() => {
      useHighlightTile(undefined);
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(tile).not.toHaveClass(classes.highlighted!);
  });
});
