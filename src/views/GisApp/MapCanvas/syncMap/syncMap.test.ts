import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";

import { describe, expect, it } from "vitest";

import { syncMap } from "@/views/GisApp/MapCanvas/syncMap/syncMap";
import {
  asMapLibreMap,
  createCollection,
  createFakeMap,
  createSpec,
  emptyCollection,
  emptySpec,
} from "@/views/GisApp/MapCanvas/syncMap/syncMap.fixtures";

describe("syncMap", () => {
  it("adds sources before the layers that use them", () => {
    const map = createFakeMap();
    syncMap({
      map: asMapLibreMap(map),
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
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.calls.length = 0;
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: emptySpec,
    });
    expect(map.calls).toEqual(["removeLayer:layer-a", "removeSource:source-a"]);
  });

  it("does not re-add an unchanged layer", () => {
    const map = createFakeMap();
    const spec = createSpec(["a"]);
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.addLayer.mockClear();
    syncMap({ map: asMapLibreMap(map), previousSpec: spec, nextSpec: spec });
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("pushes new source data when the feature collection changed", () => {
    const map = createFakeMap();
    const spec = createSpec(["a"]);
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.calls.length = 0;
    const withNewData = createSpec(["a"], createCollection());
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: withNewData,
    });
    expect(map.calls).toEqual(["setData:source-a"]);
  });

  it("does not push source data when the collection reference is unchanged", () => {
    const map = createFakeMap();
    const spec = createSpec(["a"]);
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.calls.length = 0;
    syncMap({ map: asMapLibreMap(map), previousSpec: spec, nextSpec: spec });
    expect(map.sourcesById.get("source-a")?.setData).not.toHaveBeenCalled();
  });

  it("re-adds a source and its layers when clustering changes", () => {
    const map = createFakeMap();
    const spec = createSpec(["a", "b"]);
    syncMap({
      map: asMapLibreMap(map),
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
      map: asMapLibreMap(map),
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
    const map = createFakeMap();
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
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });

    expect(map.addLayer).toHaveBeenCalledWith(spec.layers[0]);
  });

  it("replaces an existing layer when its type changes", () => {
    const map = createFakeMap();
    const circleSpec = createSpec(["density"]);
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: circleSpec,
    });
    const heatmapSpec: MapSpec = {
      ...circleSpec,
      layers: [
        {
          id: "layer-density",
          type: "heatmap",
          source: "source-density",
          paint: { "heatmap-radius": 20 },
        },
      ],
    };
    map.calls.length = 0;

    syncMap({
      map: asMapLibreMap(map),
      previousSpec: circleSpec,
      nextSpec: heatmapSpec,
    });

    expect(map.calls).toEqual([
      "removeLayer:layer-density",
      "addLayer:layer-density",
    ]);
    expect(map.setPaintProperty).not.toHaveBeenCalledWith(
      "layer-density",
      "heatmap-radius",
      20,
    );
  });

  it("updates paint in place when only paint changed", () => {
    const map = createFakeMap();
    const spec = createSpec(["a"]);
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    const repainted: MapSpec = {
      ...spec,
      layers: [{ ...spec.layers[0]!, paint: { "circle-radius": 12 } }],
    };
    map.calls.length = 0;
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: repainted,
    });
    expect(map.calls).toEqual(["setPaint:layer-a:circle-radius"]);
  });

  it("enforces draw order when layers are reordered", () => {
    const map = createFakeMap();
    const spec = createSpec(["a", "b"]);
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    const reordered: MapSpec = {
      ...spec,
      layers: [spec.layers[1]!, spec.layers[0]!],
    };
    map.calls.length = 0;
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: reordered,
    });
    expect(map.calls).toEqual(["moveLayer:layer-b", "moveLayer:layer-a"]);
  });

  it("reorders when a new layer is inserted at the bottom", () => {
    const map = createFakeMap();
    const spec = createSpec(["a", "b"]);
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.calls.length = 0;
    const withNewBottomLayer = createSpec(["c", "a", "b"]);
    syncMap({
      map: asMapLibreMap(map),
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
    const map = createFakeMap();
    const full = createSpec(["a", "b", "c"]);
    syncMap({
      map: asMapLibreMap(map),
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
      map: asMapLibreMap(map),
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
    const map = createFakeMap();
    const spec = createSpec(["a", "b"]);
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: spec,
    });
    map.calls.length = 0;
    const withNewTopLayer = createSpec(["a", "b", "c"]);
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: spec,
      nextSpec: withNewTopLayer,
    });
    expect(map.calls).toEqual(["addSource:source-c", "addLayer:layer-c"]);
  });

  it("registers no event listeners", () => {
    const map = createFakeMap();
    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: createSpec(["a"]),
    });
    expect(map.on).not.toHaveBeenCalled();
  });

  it("raises chrome overlays after the spec, preview line last", () => {
    const map = createFakeMap();
    map.addLayer({ id: "ava-map-aoi-outline-line", type: "line" });
    map.addLayer({ id: "ava-map-measure-fill", type: "fill" });
    map.addLayer({ id: "ava-map-measure-line", type: "line" });
    map.addLayer({ id: "ava-map-annotation-preview-line", type: "line" });
    map.calls.length = 0;

    syncMap({
      map: asMapLibreMap(map),
      previousSpec: emptySpec,
      nextSpec: createSpec(["a"]),
    });

    expect(
      map.calls.filter((call) => {
        return call.startsWith("moveLayer:");
      }),
    ).toEqual([
      "moveLayer:ava-map-aoi-outline-line",
      "moveLayer:ava-map-measure-fill",
      "moveLayer:ava-map-measure-line",
      "moveLayer:ava-map-annotation-preview-line",
    ]);
  });
});
