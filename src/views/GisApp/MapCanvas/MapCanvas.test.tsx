import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useMapCanvas } from "@/views/GisApp/MapCanvas/useMapCanvas";
import { useMapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";

vi.mock("@/views/GisApp/MapCanvas/FitMapBounds/FitMapBounds", () => {
  return { FitMapBounds: { useFitMapBounds: vi.fn() } };
});
vi.mock("@/views/GisApp/MapCanvas/useMapInstance", () => {
  return { useMapInstance: vi.fn() };
});
vi.mock("@/views/GisApp/MapCanvas/useMapSpecSync", () => {
  return { useMapSpecSync: vi.fn() };
});
vi.mock("@/views/GisApp/MapCanvas/useMapStyleSync", () => {
  return { useMapStyleSync: vi.fn() };
});
vi.mock("@/views/GisApp/MapCanvas/useMapViewSync/useMapViewSync", () => {
  return { useMapViewSync: vi.fn() };
});

const MAP_INSTANCE = {} as MapInstance;
describe("MapCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMapInstance).mockReturnValue(MAP_INSTANCE);
  });

  it("returns the live map instance directly to its owner", () => {
    const { result } = renderHook(() => {
      return useMapCanvas({
        basemap: { type: "none", background: "#ffffff" },
        view: { center: [0, 0], zoom: 1 },
        spec: { sources: {}, layers: [] },
        fitBoundsRequest: undefined,
        interactiveLayerIds: [],
        onFeatureClick: () => {
          return undefined;
        },
        onViewChange: () => {
          return undefined;
        },
      });
    });

    expect(result.current.mapInstance).toBe(MAP_INSTANCE);
  });
});
