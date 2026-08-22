import { makeObject } from "@avandar/utils";
import { vi } from "vitest";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { Map as MapLibreMap } from "maplibre-gl";

type FakeSource = { setData: ReturnType<typeof vi.fn> };

/** Minimal MapLibre stand-in that records `syncMap`'s imperative calls. */
export type FakeMap = {
  /** Imperative calls in the order `syncMap` made them. */
  calls: string[];

  /** The persistent source stubs, so `setData` calls stay observable. */
  sourcesById: Map<string, FakeSource>;

  on: ReturnType<typeof vi.fn>;
  getSource: (id: string) => FakeSource | undefined;
  addSource: ReturnType<typeof vi.fn>;
  removeSource: ReturnType<typeof vi.fn>;
  getLayer: (id: string) => { id: string; type: string } | undefined;
  addLayer: ReturnType<typeof vi.fn>;
  removeLayer: ReturnType<typeof vi.fn>;
  moveLayer: ReturnType<typeof vi.fn>;
  setPaintProperty: ReturnType<typeof vi.fn>;
  setLayoutProperty: ReturnType<typeof vi.fn>;
};

/**
 * Minimal stand-in for the MapLibre surface `syncMap` touches. Records calls
 * so tests can assert on the imperative sequence.
 */
export function createFakeMap(): FakeMap {
  const sourcesById = new Map<string, FakeSource>();
  const layersById = new Map<string, { id: string; type: string }>();
  const calls: string[] = [];
  return {
    calls,
    sourcesById,
    // `on` exists so the "registers no listeners" test observes a real spy
    // rather than an absent property.
    on: vi.fn(),
    getSource: (id: string) => {
      return sourcesById.get(id);
    },
    addSource: vi.fn((id: string) => {
      sourcesById.set(id, {
        setData: vi.fn(() => {
          calls.push(`setData:${id}`);
        }),
      });
      calls.push(`addSource:${id}`);
    }),
    removeSource: vi.fn((id: string) => {
      sourcesById.delete(id);
      calls.push(`removeSource:${id}`);
    }),
    getLayer: (id: string) => {
      return layersById.get(id);
    },
    addLayer: vi.fn((layer: { id: string; type: string }) => {
      layersById.set(layer.id, layer);
      calls.push(`addLayer:${layer.id}`);
    }),
    removeLayer: vi.fn((id: string) => {
      layersById.delete(id);
      calls.push(`removeLayer:${id}`);
    }),
    moveLayer: vi.fn((id: string) => {
      calls.push(`moveLayer:${id}`);
    }),
    setPaintProperty: vi.fn((layerId: string, property: string) => {
      calls.push(`setPaint:${layerId}:${property}`);
    }),
    setLayoutProperty: vi.fn((layerId: string, property: string) => {
      calls.push(`setLayout:${layerId}:${property}`);
    }),
  };
}

/** The one place the fake is widened to the real MapLibre surface. */
export function asMapLibreMap(map: FakeMap): MapLibreMap {
  return map as unknown as MapLibreMap;
}

/** An empty GeoJSON collection, used when a test only cares about ids. */
export function createCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

/** Shared empty collection so unchanged-data tests keep the same reference. */
export const emptyCollection = createCollection();

/** A spec with one circle layer per id, sharing emptyCollection by default. */
export function createSpec(
  layerIds: readonly string[],
  data: GeoJSON.FeatureCollection = emptyCollection,
): MapSpec {
  return {
    sources: makeObject(layerIds, {
      keyFn: (layerId) => {
        return `source-${layerId}`;
      },
      valueFn: () => {
        return { type: "geojson" as const, data };
      },
    }),
    layers: layerIds.map((layerId) => {
      return {
        id: `layer-${layerId}`,
        type: "circle" as const,
        source: `source-${layerId}`,
        paint: { "circle-radius": 6 },
      };
    }),
  };
}

/** A map spec with no sources or layers. */
export const emptySpec: MapSpec = { sources: {}, layers: [] };
