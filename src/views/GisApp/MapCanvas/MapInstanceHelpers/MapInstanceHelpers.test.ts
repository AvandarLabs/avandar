import { objectKeys } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapInstanceRefs } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { LatestMapValues } from "@/views/GisApp/MapCanvas/useLatestMapValues";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

const { eventHandlers, mapConstructorMock, mapLibreMapMock } = vi.hoisted(
  () => {
    const handlers: Record<string, ((event: unknown) => void) | undefined> = {};
    const liveMapMock = {
      addControl: vi.fn(),
      easeTo: vi.fn(),
      getLayer: vi.fn(),
      getSource: vi.fn(),
      off: vi.fn(),
      on: vi.fn((eventName: string, handler: (event: unknown) => void) => {
        handlers[eventName] = handler;
      }),
      queryRenderedFeatures: vi.fn(),
      remove: vi.fn(),
    };
    const constructMapMock = vi.fn(function mapConstructor() {
      return liveMapMock;
    });
    return {
      eventHandlers: handlers,
      mapConstructorMock: constructMapMock,
      mapLibreMapMock: liveMapMock,
    };
  },
);

vi.mock("maplibre-gl", () => {
  return {
    default: {
      Map: mapConstructorMock,
      NavigationControl: vi.fn(),
    },
  };
});

const { EMPTY_MAP_SPEC, MapInstanceHelpers } =
  await import("@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers");

const basemap: AvaMapConfig.Basemap = {
  type: "builtIn",
  style: "avandar",
};

function attachMapWithLatestValues(latestValues: LatestMapValues): void {
  const instanceRefs: MapInstanceRefs = {
    mapRef: { current: undefined },
    appliedSpecRef: { current: EMPTY_MAP_SPEC },
    appliedStyleKeyRef: { current: undefined },
    isStyleSwapPendingRef: { current: false },
  };

  MapInstanceHelpers.attach({
    basemap,
    container: document.createElement("div"),
    emptySpec: EMPTY_MAP_SPEC,
    instanceRefs,
    latestValues,
    setStyleLoadCount: vi.fn(),
    view: { center: [0, 0], zoom: 1 },
  });
}

describe("MapInstanceHelpers map click", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    objectKeys(eventHandlers).forEach((eventName) => {
      delete eventHandlers[eventName];
    });
  });

  it("expands a cluster on click instead of opening the feature inspector", async () => {
    const clusterFeature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.9, 40.7] },
      properties: { cluster_id: 42, point_count: 100 },
      layer: { id: "ava-map-layer-clinics" },
      source: "ava-map-source-clinics",
    };
    const getClusterExpansionZoom = vi.fn().mockResolvedValue(12);
    mapLibreMapMock.getLayer.mockReturnValue({ id: "ava-map-layer-clinics" });
    mapLibreMapMock.queryRenderedFeatures.mockReturnValue([clusterFeature]);
    mapLibreMapMock.getSource.mockReturnValue({ getClusterExpansionZoom });
    const onFeatureClick = vi.fn();
    attachMapWithLatestValues({
      basemapRef: { current: basemap },
      interactiveLayerIdsRef: {
        current: ["ava-map-layer-clinics", "ava-map-layer-clinics-unclustered"],
      },
      onFeatureClickRef: { current: onFeatureClick },
    });

    eventHandlers.click?.({ point: { x: 10, y: 12 } });

    await vi.waitFor(() => {
      expect(getClusterExpansionZoom).toHaveBeenCalledWith(42);
    });
    expect(mapLibreMapMock.easeTo).toHaveBeenCalledWith({
      center: [-73.9, 40.7],
      zoom: 12,
    });
    expect(onFeatureClick).not.toHaveBeenCalled();
  });

  it("does nothing when heatmap layers are excluded from hit testing", () => {
    const onFeatureClick = vi.fn();
    attachMapWithLatestValues({
      basemapRef: { current: basemap },
      interactiveLayerIdsRef: { current: [] },
      onFeatureClickRef: { current: onFeatureClick },
    });

    eventHandlers.click?.({ point: { x: 10, y: 12 } });

    expect(mapLibreMapMock.queryRenderedFeatures).not.toHaveBeenCalled();
    expect(onFeatureClick).not.toHaveBeenCalled();
    expect(mapLibreMapMock.easeTo).not.toHaveBeenCalled();
  });
});
