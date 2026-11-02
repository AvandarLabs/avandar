import { objectKeys } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapInstanceRefs } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { LatestMapValues } from "@/views/GisApp/MapCanvas/useLatestMapValues";

const { eventHandlers, mapConstructorMock, mapLibreMapMock } = vi.hoisted(
  () => {
    const handlers: Record<string, ((event: unknown) => void) | undefined> = {};
    const liveMapMock = {
      addControl: vi.fn(),
      getLayer: vi.fn(),
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

describe("MapCanvas attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    objectKeys(eventHandlers).forEach((eventName) => {
      delete eventHandlers[eventName];
    });
    delete window.__avandarE2EMap;
  });

  it("disables MapLibre attribution when the furniture bar owns it", () => {
    const basemap: AvaMapConfig.Basemap = {
      type: "builtIn",
      style: "avandar",
    };
    const instanceRefs: MapInstanceRefs = {
      mapRef: { current: undefined },
      appliedSpecRef: { current: EMPTY_MAP_SPEC },
      appliedStyleKeyRef: { current: undefined },
      isStyleSwapPendingRef: { current: false },
    };
    const latestValues: LatestMapValues = {
      basemapRef: { current: basemap },
      interactiveLayerIdsRef: { current: [] },
      onFeatureClickRef: { current: vi.fn() },
      onClusterClickRef: { current: vi.fn() },
      mapToolModeRef: { current: { type: "pan" } },
    };

    const detach = MapInstanceHelpers.attach({
      basemap,
      container: document.createElement("div"),
      emptySpec: EMPTY_MAP_SPEC,
      instanceRefs,
      latestValues,
      setStyleLoadCount: vi.fn(),
      view: { center: [0, 0], zoom: 1 },
    });

    expect(mapConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ attributionControl: false }),
    );

    detach();
    expect(mapLibreMapMock.remove).toHaveBeenCalledOnce();
  });

  it("publishes the clicked rendered layer id with the feature", () => {
    const basemap: AvaMapConfig.Basemap = {
      type: "builtIn",
      style: "avandar",
    };
    const renderedFeature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: { name: "Clinic" },
      layer: { id: "ava-map-layer-clinics" },
    };
    mapLibreMapMock.getLayer.mockReturnValue({ id: "ava-map-layer-clinics" });
    mapLibreMapMock.queryRenderedFeatures.mockReturnValue([renderedFeature]);
    const onFeatureClick = vi.fn();
    const instanceRefs: MapInstanceRefs = {
      mapRef: { current: undefined },
      appliedSpecRef: { current: EMPTY_MAP_SPEC },
      appliedStyleKeyRef: { current: undefined },
      isStyleSwapPendingRef: { current: false },
    };
    const latestValues: LatestMapValues = {
      basemapRef: { current: basemap },
      interactiveLayerIdsRef: { current: ["ava-map-layer-clinics"] },
      onFeatureClickRef: { current: onFeatureClick },
      onClusterClickRef: { current: vi.fn() },
      mapToolModeRef: { current: { type: "pan" } },
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
    eventHandlers.click?.({ point: { x: 10, y: 12 } });

    expect(onFeatureClick).toHaveBeenCalledWith(
      renderedFeature,
      "ava-map-layer-clinics",
    );
  });

  it("exposes the live map for E2E inspection until the canvas detaches", () => {
    const basemap: AvaMapConfig.Basemap = {
      type: "builtIn",
      style: "avandar",
    };
    const instanceRefs: MapInstanceRefs = {
      mapRef: { current: undefined },
      appliedSpecRef: { current: EMPTY_MAP_SPEC },
      appliedStyleKeyRef: { current: undefined },
      isStyleSwapPendingRef: { current: false },
    };
    const latestValues: LatestMapValues = {
      basemapRef: { current: basemap },
      interactiveLayerIdsRef: { current: [] },
      onFeatureClickRef: { current: vi.fn() },
      onClusterClickRef: { current: vi.fn() },
      mapToolModeRef: { current: { type: "pan" } },
    };

    const detach = MapInstanceHelpers.attach({
      basemap,
      container: document.createElement("div"),
      emptySpec: EMPTY_MAP_SPEC,
      instanceRefs,
      latestValues,
      setStyleLoadCount: vi.fn(),
      view: { center: [0, 0], zoom: 1 },
    });

    expect(window.__avandarE2EMap).toBe(mapLibreMapMock);

    detach();

    expect(window.__avandarE2EMap).toBeUndefined();
  });
});
