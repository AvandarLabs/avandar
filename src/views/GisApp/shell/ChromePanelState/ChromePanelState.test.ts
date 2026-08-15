import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import { ChromePanelState } from "@/views/GisApp/shell/ChromePanelState/ChromePanelState";

const CHROME_PANEL_STORAGE_KEY = "ava:gis:chrome-panels";

beforeEach(() => {
  window.localStorage.removeItem(CHROME_PANEL_STORAGE_KEY);
});

afterEach(() => {
  window.localStorage.removeItem(CHROME_PANEL_STORAGE_KEY);
});

describe("getDefaultPanelState", () => {
  it("expands both panels on a wide canvas", () => {
    expect(ChromePanelState.fromCanvasWidth(1200)).toEqual({
      layers: false,
      inspector: false,
      legend: false,
    });
  });

  it("collapses the inspector first below 1000px of canvas", () => {
    expect(ChromePanelState.fromCanvasWidth(900)).toEqual({
      layers: false,
      inspector: true,
      legend: false,
    });
  });

  it("collapses everything at and below the tablet boundary", () => {
    expect(ChromePanelState.fromCanvasWidth(700)).toEqual({
      layers: true,
      inspector: true,
      legend: true,
    });
    expect(ChromePanelState.fromCanvasWidth(792)).toEqual({
      layers: true,
      inspector: true,
      legend: true,
    });
    expect(ChromePanelState.fromCanvasWidth(793)).toEqual({
      layers: false,
      inspector: true,
      legend: false,
    });
  });
});

describe("useChromePanelState", () => {
  it("uses the canvas width to choose the first-run default", () => {
    const { result } = renderHook(() => {
      return ChromePanelState.useChromePanelState(792);
    });

    expect(result.current.panelState).toEqual({
      layers: true,
      inspector: true,
      legend: true,
    });
  });

  it("keeps the first-run default stable when the canvas resizes", () => {
    const { result, rerender } = renderHook(
      ({ canvasWidth }) => {
        return ChromePanelState.useChromePanelState(canvasWidth);
      },
      { initialProps: { canvasWidth: 792 } },
    );

    rerender({ canvasWidth: 1200 });

    expect(result.current.panelState).toEqual({
      layers: true,
      inspector: true,
      legend: true,
    });
  });

  it("toggles one panel without changing the others", async () => {
    const { result } = renderHook(() => {
      return ChromePanelState.useChromePanelState(1200);
    });

    await act(async () => {
      result.current.togglePanel("inspector");
      await Promise.resolve();
    });

    expect(result.current.panelState).toEqual({
      layers: false,
      inspector: true,
      legend: false,
    });
  });

  it("expands a collapsed inspector without toggling it closed", async () => {
    const { result } = renderHook(() => {
      return ChromePanelState.useChromePanelState(700);
    });

    expect(result.current.panelState.inspector).toBe(true);

    await act(async () => {
      result.current.expandPanel("inspector");
      result.current.expandPanel("inspector");
      await Promise.resolve();
    });

    expect(result.current.panelState.inspector).toBe(false);
  });

  it("persists a toggle across unmount and remount", async () => {
    const firstRender = renderHook(() => {
      return ChromePanelState.useChromePanelState(1200);
    });

    await act(async () => {
      firstRender.result.current.togglePanel("layers");
      await Promise.resolve();
    });
    firstRender.unmount();

    const secondRender = renderHook(() => {
      return ChromePanelState.useChromePanelState(1200);
    });

    expect(secondRender.result.current.panelState).toEqual({
      layers: true,
      inspector: false,
      legend: false,
    });
  });
});
