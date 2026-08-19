import { objectKeys } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { CLUSTER_AUTO_THRESHOLD } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.constants";
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

  it("opens the cluster feature table on click instead of zooming", () => {
    const clusterFeature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.9, 40.7] },
      properties: { cluster_id: 42, point_count: 100 },
      layer: { id: "ava-map-layer-clinics" },
      source: "ava-map-source-clinics",
    };
    mapLibreMapMock.getLayer.mockReturnValue({ id: "ava-map-layer-clinics" });
    mapLibreMapMock.queryRenderedFeatures.mockReturnValue([clusterFeature]);
    const onFeatureClick = vi.fn();
    const onClusterClick = vi.fn();
    attachMapWithLatestValues({
      basemapRef: { current: basemap },
      interactiveLayerIdsRef: {
        current: ["ava-map-layer-clinics", "ava-map-layer-clinics-unclustered"],
      },
      onFeatureClickRef: { current: onFeatureClick },
      onClusterClickRef: { current: onClusterClick },
      mapToolModeRef: { current: { type: "pan" } },
    });

    eventHandlers.click?.({ point: { x: 10, y: 12 } });

    expect(onClusterClick).toHaveBeenCalledWith({
      sourceId: "ava-map-source-clinics",
      clusterId: 42,
      pointCount: 100,
      coordinates: [-73.9, 40.7],
      layerId: "ava-map-layer-clinics",
    });
    expect(mapLibreMapMock.easeTo).not.toHaveBeenCalled();
    expect(mapLibreMapMock.getSource).not.toHaveBeenCalled();
    expect(onFeatureClick).not.toHaveBeenCalled();
  });

  it("opens the cluster feature table for a layer that auto-clustered past the threshold, not just an explicit cluster symbology", () => {
    // Builds the real layer/source ids and cluster source shape that
    // `makeLayerSpecFromMapLayer` produces once a plain `circle` layer's
    // feature count crosses `CLUSTER_AUTO_THRESHOLD`, so this pins the click
    // behaviour for the auto-cluster path specifically rather than only
    // exercising a hand-typed id that happens to look like one.
    const layer = MapLayer.makeEmpty("Cases");
    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: Array.from(
        { length: CLUSTER_AUTO_THRESHOLD + 1 },
        (_, index) => {
          return {
            type: "Feature" as const,
            id: index,
            geometry: { type: "Point" as const, coordinates: [0, 0] },
            properties: {},
          };
        },
      ),
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });
    const sourceId = `ava-map-source-${layer.id}`;
    expect(spec.sources[sourceId]).toMatchObject({ cluster: true });
    const clusterCircleLayerId = spec.layers[0]?.id;
    const unclusteredLayerId = spec.layers[2]?.id;

    const clusterFeature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.9, 40.7] },
      properties: { cluster_id: 42, point_count: 15_000 },
      layer: { id: clusterCircleLayerId },
      source: sourceId,
    };
    mapLibreMapMock.getLayer.mockReturnValue({ id: clusterCircleLayerId });
    mapLibreMapMock.queryRenderedFeatures.mockReturnValue([clusterFeature]);
    const onFeatureClick = vi.fn();
    const onClusterClick = vi.fn();
    attachMapWithLatestValues({
      basemapRef: { current: basemap },
      interactiveLayerIdsRef: {
        current: [clusterCircleLayerId, unclusteredLayerId].filter(
          (id): id is string => {
            return id !== undefined;
          },
        ),
      },
      onFeatureClickRef: { current: onFeatureClick },
      onClusterClickRef: { current: onClusterClick },
      mapToolModeRef: { current: { type: "pan" } },
    });

    eventHandlers.click?.({ point: { x: 10, y: 12 } });

    expect(onClusterClick).toHaveBeenCalledWith({
      sourceId,
      clusterId: 42,
      pointCount: 15_000,
      coordinates: [-73.9, 40.7],
      layerId: clusterCircleLayerId,
    });
    expect(mapLibreMapMock.easeTo).not.toHaveBeenCalled();
    expect(onFeatureClick).not.toHaveBeenCalled();
  });

  it("does nothing when heatmap layers are excluded from hit testing", () => {
    const onFeatureClick = vi.fn();
    const onClusterClick = vi.fn();
    attachMapWithLatestValues({
      basemapRef: { current: basemap },
      interactiveLayerIdsRef: { current: [] },
      onFeatureClickRef: { current: onFeatureClick },
      onClusterClickRef: { current: onClusterClick },
      mapToolModeRef: { current: { type: "pan" } },
    });

    eventHandlers.click?.({ point: { x: 10, y: 12 } });

    expect(mapLibreMapMock.queryRenderedFeatures).not.toHaveBeenCalled();
    expect(onFeatureClick).not.toHaveBeenCalled();
    expect(onClusterClick).not.toHaveBeenCalled();
    expect(mapLibreMapMock.easeTo).not.toHaveBeenCalled();
  });

  it("does not inspect features when the map tool mode is not pan", () => {
    const onFeatureClick = vi.fn();
    const onClusterClick = vi.fn();
    mapLibreMapMock.getLayer.mockReturnValue({ id: "ava-map-layer-clinics" });
    attachMapWithLatestValues({
      basemapRef: { current: basemap },
      interactiveLayerIdsRef: { current: ["ava-map-layer-clinics"] },
      onFeatureClickRef: { current: onFeatureClick },
      onClusterClickRef: { current: onClusterClick },
      mapToolModeRef: { current: { type: "aoi" } },
    });

    eventHandlers.click?.({ point: { x: 10, y: 12 } });

    expect(mapLibreMapMock.queryRenderedFeatures).not.toHaveBeenCalled();
    expect(onFeatureClick).not.toHaveBeenCalled();
    expect(onClusterClick).not.toHaveBeenCalled();
  });
});

describe("MapInstanceHelpers.zoomToCluster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("eases the camera to the cluster's expansion zoom", async () => {
    const getClusterExpansionZoom = vi.fn().mockResolvedValue(12);
    mapLibreMapMock.getSource.mockReturnValue({ getClusterExpansionZoom });

    MapInstanceHelpers.zoomToCluster(mapLibreMapMock as never, {
      sourceId: "ava-map-source-clinics",
      clusterId: 42,
      coordinates: [-73.9, 40.7],
    });

    await vi.waitFor(() => {
      expect(getClusterExpansionZoom).toHaveBeenCalledWith(42);
    });
    expect(mapLibreMapMock.easeTo).toHaveBeenCalledWith({
      center: [-73.9, 40.7],
      zoom: 12,
    });
  });

  it("does nothing when the source cannot expand clusters", () => {
    mapLibreMapMock.getSource.mockReturnValue(undefined);

    MapInstanceHelpers.zoomToCluster(mapLibreMapMock as never, {
      sourceId: "ava-map-source-clinics",
      clusterId: 42,
      coordinates: [-73.9, 40.7],
    });

    expect(mapLibreMapMock.easeTo).not.toHaveBeenCalled();
  });
});
