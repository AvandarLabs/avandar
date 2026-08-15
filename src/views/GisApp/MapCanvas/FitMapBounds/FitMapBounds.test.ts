import { useReducedMotion } from "@mantine/hooks";
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import { FitMapBounds } from "@/views/GisApp/MapCanvas/FitMapBounds/FitMapBounds";

vi.mock("@mantine/hooks", async () => {
  const actual =
    await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return {
    ...actual,
    useReducedMotion: vi.fn(() => {
      return false;
    }),
  };
});

function _createMapInstance(fakeMap: { fitBounds: ReturnType<typeof vi.fn> }): {
  mapRef: { current: typeof fakeMap };
} {
  return { mapRef: { current: fakeMap } };
}

const PADDING = { top: 24, right: 360, bottom: 88, left: 304 };
const BOUNDS = [
  [-73.99, 40.7],
  [-73.95, 40.78],
] as [[number, number], [number, number]];
type BoundsProps = { currentBounds: typeof BOUNDS | undefined };

describe("useFitMapBounds", () => {
  it("assigns the first defined bounds request id after an effect", async () => {
    const { result, rerender } = renderHook(
      ({ currentBounds }: BoundsProps) => {
        return FitMapBounds.useLegacyFitBoundsRequest({
          bounds: currentBounds,
          padding: PADDING,
        });
      },
      {
        initialProps: { currentBounds: undefined } as BoundsProps,
      },
    );

    expect(result.current).toBeUndefined();

    rerender({ currentBounds: BOUNDS });

    await waitFor(() => {
      expect(result.current?.id).toBe(1);
    });
  });

  it("does not refit identical-value bounds from a background refetch", async () => {
    const fakeMap = { fitBounds: vi.fn() };
    const mapInstance = _createMapInstance(fakeMap);
    const { result, rerender } = renderHook(
      ({ currentBounds }: BoundsProps) => {
        const request = FitMapBounds.useLegacyFitBoundsRequest({
          bounds: currentBounds,
          padding: PADDING,
        });
        FitMapBounds.useFitMapBounds({ mapInstance, request });
        return request;
      },
      { initialProps: { currentBounds: BOUNDS } as BoundsProps },
    );

    await waitFor(() => {
      expect(result.current?.id).toBe(1);
    });
    const initialRequestId = result.current?.id;

    rerender({ currentBounds: [...BOUNDS] as typeof BOUNDS });

    await waitFor(() => {
      expect(result.current?.id).toBe(initialRequestId);
    });
    expect(fakeMap.fitBounds).toHaveBeenCalledTimes(1);
  });

  it("creates a new id for changed equal-count bounds", async () => {
    const fakeMap = { fitBounds: vi.fn() };
    const mapInstance = _createMapInstance(fakeMap);
    const changedBounds = [
      [-73.98, 40.7],
      [-73.94, 40.78],
    ] as typeof BOUNDS;
    const { result, rerender } = renderHook(
      ({ currentBounds }: { currentBounds: typeof BOUNDS }) => {
        const request = FitMapBounds.useLegacyFitBoundsRequest({
          bounds: currentBounds,
          padding: PADDING,
        });
        FitMapBounds.useFitMapBounds({ mapInstance, request });
        return request;
      },
      { initialProps: { currentBounds: BOUNDS } },
    );

    await waitFor(() => {
      expect(result.current?.id).toBe(1);
    });
    const initialRequestId = result.current?.id;

    rerender({ currentBounds: changedBounds });

    await waitFor(() => {
      expect(result.current?.id).toBe(2);
      expect(result.current?.id).not.toBe(initialRequestId);
      expect(result.current?.bounds).toEqual(changedBounds);
    });
    expect(fakeMap.fitBounds).toHaveBeenCalledTimes(2);
  });

  it("clears an undefined request and increments when bounds return", async () => {
    const fakeMap = { fitBounds: vi.fn() };
    const mapInstance = _createMapInstance(fakeMap);
    const { result, rerender } = renderHook(
      ({ currentBounds }: BoundsProps) => {
        const request = FitMapBounds.useLegacyFitBoundsRequest({
          bounds: currentBounds,
          padding: PADDING,
        });
        FitMapBounds.useFitMapBounds({ mapInstance, request });
        return request;
      },
      { initialProps: { currentBounds: BOUNDS } as BoundsProps },
    );

    await waitFor(() => {
      expect(result.current?.id).toBe(1);
    });

    rerender({ currentBounds: undefined });

    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });

    rerender({ currentBounds: BOUNDS });

    await waitFor(() => {
      expect(result.current?.id).toBe(2);
    });
    expect(fakeMap.fitBounds).toHaveBeenCalledTimes(2);
  });

  it("uses padding values as dependencies and refits deliberate changes", async () => {
    const fakeMap = { fitBounds: vi.fn() };
    const mapInstance = _createMapInstance(fakeMap);
    const changedPadding = { ...PADDING, left: 320 };
    const { result, rerender } = renderHook(
      ({ currentPadding }: { currentPadding: typeof PADDING }) => {
        const request = FitMapBounds.useLegacyFitBoundsRequest({
          bounds: [...BOUNDS] as typeof BOUNDS,
          padding: { ...currentPadding },
        });
        FitMapBounds.useFitMapBounds({ mapInstance, request });
        return request;
      },
      { initialProps: { currentPadding: PADDING } },
    );

    await waitFor(() => {
      expect(result.current?.id).toBe(1);
    });

    rerender({ currentPadding: { ...PADDING } });

    await waitFor(() => {
      expect(result.current?.id).toBe(1);
    });
    expect(fakeMap.fitBounds).toHaveBeenCalledTimes(1);

    rerender({ currentPadding: changedPadding });

    await waitFor(() => {
      expect(result.current?.id).toBe(2);
      expect(result.current?.padding).toEqual(changedPadding);
    });
    expect(fakeMap.fitBounds).toHaveBeenCalledTimes(2);
  });

  it("applies a request once and reapplies equal bounds for a new id", () => {
    const fakeMap = { fitBounds: vi.fn() };
    const mapInstance = _createMapInstance(fakeMap);
    const { rerender } = renderHook(
      ({
        request,
      }: {
        request: Parameters<typeof FitMapBounds.useFitMapBounds>[0]["request"];
      }) => {
        FitMapBounds.useFitMapBounds({ mapInstance, request });
      },
      {
        initialProps: {
          request: { id: 1, bounds: BOUNDS, padding: PADDING },
        },
      },
    );

    expect(fakeMap.fitBounds).toHaveBeenCalledTimes(1);
    expect(fakeMap.fitBounds).toHaveBeenLastCalledWith(BOUNDS, {
      padding: PADDING,
      animate: true,
      duration: 800,
    });

    rerender({
      request: {
        id: 1,
        bounds: [...BOUNDS] as typeof BOUNDS,
        padding: PADDING,
      },
    });
    expect(fakeMap.fitBounds).toHaveBeenCalledTimes(1);

    rerender({
      request: {
        id: 2,
        bounds: [...BOUNDS] as typeof BOUNDS,
        padding: PADDING,
      },
    });
    expect(fakeMap.fitBounds).toHaveBeenCalledTimes(2);
  });

  it("disables camera animation when reduced motion is preferred", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    const fakeMap = { fitBounds: vi.fn() };

    renderHook(() => {
      FitMapBounds.useFitMapBounds({
        mapInstance: _createMapInstance(fakeMap),
        request: { id: 1, bounds: BOUNDS, padding: PADDING },
      });
    });

    expect(fakeMap.fitBounds).toHaveBeenCalledWith(BOUNDS, {
      padding: PADDING,
      animate: false,
      duration: 0,
    });
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });
});
