import { makeObject } from "@avandar/utils";
import { describe, expect, it, vi } from "vitest";
import { syncMap } from "@/views/GisApp/MapCanvas/syncMap/syncMap";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { Map as MapLibreMap } from "maplibre-gl";

type FakeSource = { setData: ReturnType<typeof vi.fn> };

type FakeMap = {
  /** Imperative calls in the order `syncMap` made them. */
  calls: string[];

  /** The persistent source stubs, so `setData` calls stay observable. */
  sourcesById: Map<string, FakeSource>;

  on: ReturnType<typeof vi.fn>;
  getSource: (id: string) => FakeSource | undefined;
  addSource: ReturnType<typeof vi.fn>;
  removeSource: ReturnType<typeof vi.fn>;
  getLayer: (id: string) => { id: string } | undefined;
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
function _createFakeMap(): FakeMap {
  const sourcesById = new Map<string, FakeSource>();
  const layers = new Set<string>();
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

/** The one place the fake is widened to the real MapLibre surface. */
function _asMapLibreMap(map: FakeMap): MapLibreMap {
  return map as unknown as MapLibreMap;
}

function _createCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

const emptyCollection = _createCollection();

function _createSpec(
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

const emptySpec: MapSpec = { sources: {}, layers: [] };

describe("syncMap", () => {
  it("adds sources before the layers that use them", () => {
    const map = _createFakeMap();
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: _createSpec(["a"]),
    });
    expect(map.calls.indexOf("addSource:source-a")).toBeLessThan(
      map.calls.indexOf("addLayer:layer-a"),
    );
  });

  it("removes layers before their sources", () => {
    const map = _createFakeMap();
    const spec = _createSpec(["a"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.calls.length = 0;
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: emptySpec,
    });
    expect(map.calls).toEqual(["removeLayer:layer-a", "removeSource:source-a"]);
  });

  it("does not re-add an unchanged layer", () => {
    const map = _createFakeMap();
    const spec = _createSpec(["a"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.addLayer.mockClear();
    syncMap({ map: _asMapLibreMap(map), previousSpec: spec, nextSpec: spec });
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("pushes new source data when the feature collection changed", () => {
    const map = _createFakeMap();
    const spec = _createSpec(["a"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.calls.length = 0;
    const withNewData = _createSpec(["a"], _createCollection());
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: withNewData,
    });
    expect(map.calls).toEqual(["setData:source-a"]);
  });

  it("does not push source data when the collection reference is unchanged", () => {
    const map = _createFakeMap();
    const spec = _createSpec(["a"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.calls.length = 0;
    syncMap({ map: _asMapLibreMap(map), previousSpec: spec, nextSpec: spec });
    expect(map.sourcesById.get("source-a")?.setData).not.toHaveBeenCalled();
  });

  it("re-adds a source and its layers when clustering changes", () => {
    const map = _createFakeMap();
    const spec = _createSpec(["a", "b"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    const clustered: MapSpec = {
      ...spec,
      sources: {
        ...spec.sources,
        "source-a": {
          ...spec.sources["source-a"]!,
          cluster: true,
          clusterRadius: 40,
          clusterMaxZoom: 14,
        },
      },
    };
    map.calls.length = 0;
    map.addSource.mockClear();

    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: clustered,
    });

    expect(map.calls).toEqual([
      "removeLayer:layer-a",
      "removeSource:source-a",
      "addSource:source-a",
      "addLayer:layer-a",
      "moveLayer:layer-a",
      "moveLayer:layer-b",
    ]);
    expect(map.addSource).toHaveBeenCalledWith(
      "source-a",
      clustered.sources["source-a"],
    );
    expect(map.sourcesById.get("source-a")?.setData).not.toHaveBeenCalled();
  });

  it("adds heatmap layer specs as heatmap layers", () => {
    const map = _createFakeMap();
    const spec: MapSpec = {
      sources: {
        density: { type: "geojson", data: emptyCollection },
      },
      layers: [
        {
          id: "density-heatmap",
          type: "heatmap",
          source: "density",
          paint: { "heatmap-radius": 20 },
        },
      ],
    };

    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });

    expect(map.addLayer).toHaveBeenCalledWith(spec.layers[0]);
  });

  it("updates paint in place when only paint changed", () => {
    const map = _createFakeMap();
    const spec = _createSpec(["a"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    const repainted: MapSpec = {
      ...spec,
      layers: [{ ...spec.layers[0]!, paint: { "circle-radius": 12 } }],
    };
    map.calls.length = 0;
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: repainted,
    });
    expect(map.calls).toEqual(["setPaint:layer-a:circle-radius"]);
  });

  it("enforces draw order when layers are reordered", () => {
    const map = _createFakeMap();
    const spec = _createSpec(["a", "b"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    const reordered: MapSpec = {
      ...spec,
      layers: [spec.layers[1]!, spec.layers[0]!],
    };
    map.calls.length = 0;
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: reordered,
    });
    expect(map.calls).toEqual(["moveLayer:layer-b", "moveLayer:layer-a"]);
  });

  it("reorders when a new layer is inserted at the bottom", () => {
    const map = _createFakeMap();
    const spec = _createSpec(["a", "b"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.calls.length = 0;
    const withNewBottomLayer = _createSpec(["c", "a", "b"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: withNewBottomLayer,
    });
    expect(map.calls).toEqual([
      "addSource:source-c",
      "addLayer:layer-c",
      "moveLayer:layer-c",
      "moveLayer:layer-a",
      "moveLayer:layer-b",
    ]);
  });

  it("reorders survivors when a layer is removed in the same sync", () => {
    const map = _createFakeMap();
    const full = _createSpec(["a", "b", "c"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: full,
    });
    map.calls.length = 0;
    const survivorsReordered: MapSpec = {
      sources: {
        "source-c": full.sources["source-c"]!,
        "source-a": full.sources["source-a"]!,
      },
      layers: [full.layers[2]!, full.layers[0]!],
    };
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: full,
      nextSpec: survivorsReordered,
    });
    expect(map.calls).toEqual([
      "removeLayer:layer-b",
      "removeSource:source-b",
      "moveLayer:layer-c",
      "moveLayer:layer-a",
    ]);
  });

  it("does not reorder when a new layer is only appended at the top", () => {
    const map = _createFakeMap();
    const spec = _createSpec(["a", "b"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.calls.length = 0;
    const withNewTopLayer = _createSpec(["a", "b", "c"]);
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: withNewTopLayer,
    });
    expect(map.calls).toEqual(["addSource:source-c", "addLayer:layer-c"]);
  });

  it("registers no event listeners", () => {
    const map = _createFakeMap();
    syncMap({
      map: _asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: _createSpec(["a"]),
    });
    expect(map.on).not.toHaveBeenCalled();
  });
});
