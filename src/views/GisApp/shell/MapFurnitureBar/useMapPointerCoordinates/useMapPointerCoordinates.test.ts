import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useMapPointerCoordinates } from "@/views/GisApp/shell/MapFurnitureBar/useMapPointerCoordinates/useMapPointerCoordinates";
import type { MapPointerEventSource } from "@/views/GisApp/shell/MapFurnitureBar/useMapPointerCoordinates/useMapPointerCoordinates";
import type { MapMouseEvent } from "maplibre-gl";

describe("useMapPointerCoordinates", () => {
  it("tracks pointer coordinates and removes both listeners on cleanup", () => {
    const listeners = new Map<string, Set<(event: MapMouseEvent) => void>>();
    const map: MapPointerEventSource = {
      on: vi.fn(
        (eventName: string, listener: (event: MapMouseEvent) => void) => {
          const eventListeners = listeners.get(eventName) ?? new Set();
          eventListeners.add(listener);
          listeners.set(eventName, eventListeners);
          return map;
        },
      ),
      off: vi.fn(
        (eventName: string, listener: (event: MapMouseEvent) => void) => {
          listeners.get(eventName)?.delete(listener);
          return map;
        },
      ),
    };
    const mapInstance = {
      mapRef: { current: map },
    };

    const { result, unmount } = renderHook(() => {
      return useMapPointerCoordinates(mapInstance);
    });

    const [onMouseMove] = [...(listeners.get("mousemove") ?? [])];
    if (!onMouseMove) {
      throw new Error("mousemove listener was not registered");
    }
    act(() => {
      onMouseMove({
        lngLat: { lng: -73.987, lat: 40.748 },
      } as MapMouseEvent);
    });

    expect(result.current).toEqual({ longitude: -73.987, latitude: 40.748 });

    const [onMouseOut] = [...(listeners.get("mouseout") ?? [])];
    if (!onMouseOut) {
      throw new Error("mouseout listener was not registered");
    }
    expect(map.on).toHaveBeenCalledWith("mouseout", onMouseOut);

    act(() => {
      onMouseOut({} as MapMouseEvent);
    });

    expect(result.current).toBeUndefined();

    unmount();

    expect(map.off).toHaveBeenCalledWith("mousemove", onMouseMove);
    expect(map.off).toHaveBeenCalledWith("mouseout", onMouseOut);
    expect(listeners.get("mousemove")).toHaveLength(0);
    expect(listeners.get("mouseout")).toHaveLength(0);
  });
});
