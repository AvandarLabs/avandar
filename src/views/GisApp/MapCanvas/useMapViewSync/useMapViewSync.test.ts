import { describe, expect, it, vi } from "vitest";

import { act, renderHook } from "@/test-utils";
import { useMapViewSync } from "@/views/GisApp/MapCanvas/useMapViewSync/useMapViewSync";

type MoveEndHandler = () => void;

type FakeMap = {
  getCenter: ReturnType<typeof vi.fn>;
  getZoom: ReturnType<typeof vi.fn>;
  jumpTo: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

function _createMapHarness(): {
  map: FakeMap;
  mapInstance: { mapRef: { current: FakeMap } };
  moveCamera: (
    options: Readonly<{
      center: { lng: number; lat: number };
      zoom: number;
    }>,
  ) => void;
} {
  let center = { lng: -74, lat: 40 };
  let zoom = 8;
  let moveEndHandler: MoveEndHandler | undefined;
  const map = {
    getCenter: vi.fn(() => {
      return center;
    }),
    getZoom: vi.fn(() => {
      return zoom;
    }),
    jumpTo: vi.fn(
      (options: { center: readonly [number, number]; zoom: number }) => {
        center = { lng: options.center[0], lat: options.center[1] };
        zoom = options.zoom;
        moveEndHandler?.();
      },
    ),
    on: vi.fn((eventName: string, handler: MoveEndHandler) => {
      if (eventName === "moveend") {
        moveEndHandler = handler;
      }
    }),
    off: vi.fn(),
  };
  const mapInstance = { mapRef: { current: map } };

  return {
    map,
    mapInstance,
    moveCamera: ({ center: nextCenter, zoom: nextZoom }) => {
      center = nextCenter;
      zoom = nextZoom;
      moveEndHandler?.();
    },
  };
}

describe("useMapViewSync", () => {
  it("publishes the camera after a user pan or zoom", () => {
    const harness = _createMapHarness();
    const onViewChange = vi.fn();
    renderHook(() => {
      return useMapViewSync({
        mapInstance: harness.mapInstance,
        view: { center: [-74, 40], zoom: 8 },
        onViewChange,
      });
    });

    act(() => {
      harness.moveCamera({ center: { lng: 12.5, lat: 34.25 }, zoom: 9.5 });
    });

    expect(onViewChange).toHaveBeenCalledWith({
      center: [12.5, 34.25],
      zoom: 9.5,
    });
  });

  it("moves to a changed config view without publishing it back", () => {
    const harness = _createMapHarness();
    const onViewChange = vi.fn();
    const { rerender } = renderHook(
      ({ center, zoom }) => {
        return useMapViewSync({
          mapInstance: harness.mapInstance,
          view: { center, zoom },
          onViewChange,
        });
      },
      {
        initialProps: {
          center: [-74, 40] as [number, number],
          zoom: 8,
        },
      },
    );

    rerender({ center: [16, 48], zoom: 11 });

    expect(harness.map.jumpTo).toHaveBeenCalledWith({
      center: [16, 48],
      zoom: 11,
    });
    expect(onViewChange).not.toHaveBeenCalled();
  });
});
