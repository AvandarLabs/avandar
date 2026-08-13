import { describe, expect, it, vi } from "vitest";
import { syncMap } from "@/views/GISApp/MapCanvas/syncMap";
import type { MapSpec } from "@/views/GISApp/layers/createMapSpec/MapSpec.types";

/**
 * Minimal stand-in for the MapLibre surface `syncMap` touches. Records calls
 * so tests can assert on the imperative sequence.
 */
function createFakeMap() {
  const sources = new Set<string>();
  const layers = new Set<string>();
  const calls: string[] = [];
  return {
    calls,
    getSource: (id: string) => {
      return sources.has(id) ? { setData: vi.fn() } : undefined;
    },
    addSource: vi.fn((id: string) => {
      sources.add(id);
      calls.push(`addSource:${id}`);
    }),
    removeSource: vi.fn((id: string) => {
      sources.delete(id);
      calls.push(`removeSource:${id}`);
    }),
    getLayer: (id: string) => {
      return layers.has(id) ? { id } : undefined;
    },
    addLayer: vi.fn((layer: { id: string }) => {
      layers.add(layer.id);
      calls.push(`addLayer:${layer.id}`);
    }),
    removeLayer: vi.fn((id: string) => {
      layers.delete(id);
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

const emptyCollection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function createSpec(layerIds: readonly string[]): MapSpec {
  return {
    sources: Object.fromEntries(
      layerIds.map((id) => {
        return [
          `source-${id}`,
          { type: "geojson" as const, data: emptyCollection },
        ];
      }),
    ),
    layers: layerIds.map((id) => {
      return {
        id: `layer-${id}`,
        type: "circle" as const,
        source: `source-${id}`,
        paint: { "circle-radius": 6 },
      };
    }),
  };
}

const emptySpec: MapSpec = { sources: {}, layers: [] };

describe("syncMap", () => {
  it("adds sources before the layers that use them", () => {
    const map = createFakeMap();
    syncMap({
      map: map as never,
      previousSpec: emptySpec,
      nextSpec: createSpec(["a"]),
    });
    expect(map.calls.indexOf("addSource:source-a")).toBeLessThan(
      map.calls.indexOf("addLayer:layer-a"),
    );
  });

  it("removes layers before their sources", () => {
    const map = createFakeMap();
    const spec = createSpec(["a"]);
    syncMap({ map: map as never, previousSpec: emptySpec, nextSpec: spec });
    map.calls.length = 0;
    syncMap({ map: map as never, previousSpec: spec, nextSpec: emptySpec });
    expect(map.calls).toEqual(["removeLayer:layer-a", "removeSource:source-a"]);
  });

  it("does not re-add an unchanged layer", () => {
    const map = createFakeMap();
    const spec = createSpec(["a"]);
    syncMap({ map: map as never, previousSpec: emptySpec, nextSpec: spec });
    map.addLayer.mockClear();
    syncMap({ map: map as never, previousSpec: spec, nextSpec: spec });
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("updates paint in place when only paint changed", () => {
    const map = createFakeMap();
    const spec = createSpec(["a"]);
    syncMap({ map: map as never, previousSpec: emptySpec, nextSpec: spec });
    const repainted: MapSpec = {
      ...spec,
      layers: [{ ...spec.layers[0]!, paint: { "circle-radius": 12 } }],
    };
    map.calls.length = 0;
    syncMap({ map: map as never, previousSpec: spec, nextSpec: repainted });
    expect(map.calls).toEqual(["setPaint:layer-a:circle-radius"]);
  });

  it("enforces draw order when layers are reordered", () => {
    const map = createFakeMap();
    const spec = createSpec(["a", "b"]);
    syncMap({ map: map as never, previousSpec: emptySpec, nextSpec: spec });
    const reordered: MapSpec = {
      ...spec,
      layers: [spec.layers[1]!, spec.layers[0]!],
    };
    map.calls.length = 0;
    syncMap({ map: map as never, previousSpec: spec, nextSpec: reordered });
    expect(map.calls).toEqual(["moveLayer:layer-b", "moveLayer:layer-a"]);
  });

  it("registers no event listeners", () => {
    const map = createFakeMap() as Record<string, unknown>;
    syncMap({
      map: map as never,
      previousSpec: emptySpec,
      nextSpec: createSpec(["a"]),
    });
    expect(map.on).toBeUndefined();
  });
});
