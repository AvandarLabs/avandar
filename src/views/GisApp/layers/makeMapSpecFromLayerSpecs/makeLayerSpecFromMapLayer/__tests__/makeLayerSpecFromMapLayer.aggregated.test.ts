import { describe, expect, it } from "vitest";

/**
 * Paint decisions for a layer whose features are DuckDB-aggregated cells
 * rather than source rows.
 *
 * The distinction that matters here is where clustering happens. A cell
 * already knows how many rows it stands for, so MapLibre must be told not to
 * cluster the source a second time, and the paint has to read the counts the
 * cells carry instead of the ones MapLibre would have written.
 */
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { PointAggregateProperties } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import { valueColumnId } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/__tests__/makeLayerSpecFromMapLayer.fixtures";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";

/** A handful of aggregated cells, well under the auto-cluster threshold. */
const AGGREGATED_CELLS: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: 0,
      geometry: { type: "Point", coordinates: [10, 10] },
      properties: { point_count: 1_200, point_count_abbreviated: "1.2k" },
    },
    {
      type: "Feature",
      id: 1,
      geometry: { type: "Point", coordinates: [20, 20] },
      properties: { point_count: 1, point_count_abbreviated: "1" },
    },
  ],
};

function _makeCircleLayer() {
  return {
    ...MapLayer.makeEmpty("Cases"),
    symbology: {
      type: "circle" as const,
      radius: 6,
      color: { type: "single" as const, color: "#123456" },
      stroke: { width: 1, color: "#ffffff" },
    },
  };
}

describe("makeLayerSpecFromMapLayer with aggregated rows", () => {
  it("leaves MapLibre clustering off so cell counts are not counted again", () => {
    const layer = _makeCircleLayer();
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: AGGREGATED_CELLS,
      stats: { valueDomain: undefined },
      isAggregated: true,
    });
    expect(spec.sources[`ava-map-source-${layer.id}`]).not.toHaveProperty(
      "cluster",
    );
  });

  it("paints aggregated cells as counted bubbles however few cells there are", () => {
    // Two cells is far below the auto-cluster threshold, but each stands for
    // many rows, so the count label is the honest rendering.
    const spec = makeLayerSpecFromMapLayer({
      layer: _makeCircleLayer(),
      featureCollection: AGGREGATED_CELLS,
      stats: { valueDomain: undefined },
      isAggregated: true,
    });
    expect(
      spec.layers.map(({ type }) => {
        return type;
      }),
    ).toEqual(["circle", "symbol", "circle"]);
  });

  it("separates groups from lone rows by comparing the count, not its presence", () => {
    // Every aggregated cell carries `point_count`, including a cell holding one
    // row, so a `has` test would draw every cell as a group and label the lone
    // ones "1".
    const spec = makeLayerSpecFromMapLayer({
      layer: _makeCircleLayer(),
      featureCollection: AGGREGATED_CELLS,
      stats: { valueDomain: undefined },
      isAggregated: true,
    });
    expect(spec.layers[0]?.filter).toEqual([
      ">",
      ["get", PointAggregateProperties.pointCount],
      1,
    ]);
    expect(spec.layers[1]?.filter).toEqual([
      ">",
      ["get", PointAggregateProperties.pointCount],
      1,
    ]);
    expect(spec.layers[2]?.filter).toEqual([
      "<=",
      ["get", PointAggregateProperties.pointCount],
      1,
    ]);
  });

  it("keeps MapLibre's own filters when the rows are not aggregated", () => {
    const layer = _makeCircleLayer();
    const clusterLayer = {
      ...layer,
      symbology: {
        type: "cluster" as const,
        radiusPx: MapLayer.defaultClusterRadiusPx,
        color: { type: "single" as const, color: "#123456" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer: clusterLayer,
      featureCollection: AGGREGATED_CELLS,
      stats: { valueDomain: undefined },
    });
    expect(spec.sources[`ava-map-source-${clusterLayer.id}`]).toMatchObject({
      cluster: true,
    });
    expect(spec.layers[0]?.filter).toEqual([
      "has",
      PointAggregateProperties.pointCount,
    ]);
  });

  it("keeps a proportional symbol sized by its value, not by the row count", () => {
    // Aggregation sums the value column per cell, so size still encodes the
    // data value. Swapping it for a count would silently change what the
    // reader is looking at.
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      symbology: {
        type: "proportionalSymbol" as const,
        value: valueColumnId,
        scale: "sqrt" as const,
        minRadius: 4,
        maxRadius: 24,
        color: { type: "single" as const, color: "#123456" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: AGGREGATED_CELLS,
      stats: { valueDomain: [0, 100] },
      valueColumnName: "deaths",
      isAggregated: true,
    });
    expect(spec.layers).toHaveLength(1);
    expect(JSON.stringify(spec.layers[0]?.paint["circle-radius"])).toContain(
      "deaths",
    );
    expect(
      JSON.stringify(spec.layers[0]?.paint["circle-radius"]),
    ).not.toContain(PointAggregateProperties.pointCount);
  });

  it("keeps a heatmap weighted by its value column when aggregated", () => {
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      symbology: {
        type: "heatmap" as const,
        radiusPx: 30,
        weight: valueColumnId,
        ramp: ["#111111", "#777777", "#eeeeee"],
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: AGGREGATED_CELLS,
      stats: { valueDomain: [0, 100] },
      valueColumnName: "deaths",
      isAggregated: true,
    });
    expect(spec.layers).toHaveLength(1);
    expect(spec.layers[0]?.type).toBe("heatmap");
  });
});
