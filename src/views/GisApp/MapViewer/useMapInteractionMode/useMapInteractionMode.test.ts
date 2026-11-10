import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import {
  MAP_INTERACTION_HANDLER_NAMES,
  useMapInteractionMode,
} from "@/views/GisApp/MapViewer/useMapInteractionMode/useMapInteractionMode";

function _makeMap(): Record<
  (typeof MAP_INTERACTION_HANDLER_NAMES)[number],
  { enable: ReturnType<typeof vi.fn>; disable: ReturnType<typeof vi.fn> }
> {
  return Object.fromEntries(
    MAP_INTERACTION_HANDLER_NAMES.map((handlerName) => {
      return [handlerName, { enable: vi.fn(), disable: vi.fn() }];
    }),
  ) as ReturnType<typeof _makeMap>;
}

describe("useMapInteractionMode", () => {
  it("turns every pan, zoom, and rotate handler off for a fixed picture", () => {
    const map = _makeMap();

    renderHook(() => {
      useMapInteractionMode({
        mapInstance: { mapRef: { current: map } },
        isInteractive: false,
      });
    });

    MAP_INTERACTION_HANDLER_NAMES.forEach((handlerName) => {
      expect(map[handlerName].disable).toHaveBeenCalledOnce();
    });
  });

  it("turns them back on for an interactive map", () => {
    const map = _makeMap();

    renderHook(() => {
      useMapInteractionMode({
        mapInstance: { mapRef: { current: map } },
        isInteractive: true,
      });
    });

    expect(map.scrollZoom.enable).toHaveBeenCalledOnce();
  });
});
