import { objectKeys, prop } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * The symbology's `value` is a QueryColumnId, not the layer id: a layer id
 * there type-checks nowhere and would mask a real wiring mistake.
 */
const valueColumnId = uuid<QueryColumn.Id>();

const featureCollection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: 0,
      geometry: { type: "Point", coordinates: [15, -4] },
      properties: { cases: 12 },
    },
  ],
};

describe("makeLayerSpecFromMapLayer", () => {
  it("names its source and layer after the layer id", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });
    expect(objectKeys(spec.sources)).toEqual([`ava-map-source-${layer.id}`]);
    expect(spec.layers.map(prop("id"))).toEqual([`ava-map-layer-${layer.id}`]);
  });

  it("paints a flat circle with the configured radius and color", () => {
    // Deliberately non-default values: asserting the defaults would pass even
    // if makeLayerSpecFromMapLayer ignored the symbology and hardcoded them.
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      symbology: {
        type: "circle" as const,
        radius: 11,
        color: { type: "single" as const, color: "#123456" },
        stroke: { width: 3, color: "#abcdef" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });
    expect(spec.layers[0]?.paint["circle-radius"]).toBe(11);
    expect(spec.layers[0]?.paint["circle-color"]).toBe("#123456");
    expect(spec.layers[0]?.paint["circle-stroke-width"]).toBe(3);
  });

  it("selects features through feature-state, not a duplicate layer", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });
    expect(spec.layers).toHaveLength(1);
    expect(spec.layers[0]?.paint["circle-stroke-color"]).toEqual([
      "case",
      ["boolean", ["feature-state", "isSelected"], false],
      "#ffd700",
      "#ffffff",
    ]);
  });

  it("scales proportional symbols by square root of the value", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "proportionalSymbol" as const,
        value: valueColumnId,
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt" as const,
        color: { type: "single" as const, color: "#ef4444" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: [0, 100] },
      valueColumnName: "cases",
    });
    expect(spec.layers[0]?.paint["circle-radius"]).toEqual([
      "interpolate",
      ["linear"],
      ["sqrt", ["max", 0, ["-", ["to-number", ["get", "cases"], 0], 0]]],
      0,
      4,
      10,
      24,
    ]);
  });

  it("interpolates linearly, unscaled, when the scale is linear", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "proportionalSymbol" as const,
        value: valueColumnId,
        minRadius: 4,
        maxRadius: 24,
        scale: "linear" as const,
        color: { type: "single" as const, color: "#ef4444" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: [0, 100] },
      valueColumnName: "cases",
    });
    expect(spec.layers[0]?.paint["circle-radius"]).toEqual([
      "interpolate",
      ["linear"],
      ["max", 0, ["-", ["to-number", ["get", "cases"], 0], 0]],
      0,
      4,
      100,
      24,
    ]);
  });

  it("shifts normalization correctly for a negative domain minimum", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "proportionalSymbol" as const,
        value: valueColumnId,
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt" as const,
        color: { type: "single" as const, color: "#ef4444" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: [-50, 50] },
      valueColumnName: "cases",
    });
    expect(spec.layers[0]?.paint["circle-radius"]).toEqual([
      "interpolate",
      ["linear"],
      ["sqrt", ["max", 0, ["-", ["to-number", ["get", "cases"], 0], -50]]],
      0,
      4,
      10,
      24,
    ]);
  });

  it("falls back to the minimum radius when the domain is degenerate", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "proportionalSymbol" as const,
        value: valueColumnId,
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt" as const,
        color: { type: "single" as const, color: "#ef4444" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: [50, 50] },
      valueColumnName: "cases",
    });
    expect(spec.layers[0]?.paint["circle-radius"]).toBe(4);
  });

  it("falls back to the minimum radius when there is no value domain", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "proportionalSymbol" as const,
        value: valueColumnId,
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt" as const,
        color: { type: "single" as const, color: "#ef4444" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
      valueColumnName: "cases",
    });
    expect(spec.layers[0]?.paint["circle-radius"]).toBe(4);
  });

  it("hides a layer that is not visible", () => {
    const layer = { ...MapLayer.makeEmpty("Cases"), isVisible: false };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });
    expect(spec.layers[0]?.layout).toEqual({ visibility: "none" });
  });

  it("renders line geometry with line paint", () => {
    const base = MapLayer.makeEmpty("Roads");
    const layer: MapLayer.T = {
      ...base,
      symbology: {
        type: "line",
        color: { type: "single", color: "#123456" },
        stroke: { width: 4, color: "#abcdef" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });

    expect(spec.layers[0]).toMatchObject({
      type: "line",
      paint: { "line-color": "#123456", "line-width": 4 },
    });
  });

  it("renders polygon geometry as fill followed by its outline", () => {
    const base = MapLayer.createArea("Districts");
    const layer: MapLayer.T = {
      ...base,
      symbology: {
        type: "fill",
        color: { type: "single", color: "#123456" },
        stroke: { width: 2, color: "#abcdef" },
        opacity: 0.6,
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });

    expect(
      spec.layers.map(({ type }) => {
        return type;
      }),
    ).toEqual(["fill", "line"]);
    expect(spec.layers[0]?.paint).toMatchObject({
      "fill-color": "#123456",
      "fill-opacity": 0.6,
    });
    expect(spec.layers[1]?.paint).toMatchObject({
      "line-color": "#abcdef",
      "line-width": 2,
    });
  });

  it("paints graduated classes after suppressed and no-data states", () => {
    const base = MapLayer.createArea("Districts");
    const layer = {
      ...base,
      symbology: {
        ...base.symbology,
        color: {
          type: "graduated" as const,
          value: {
            type: "areaAggregation" as const,
            outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
          },
          ramp: ["#fee", "#f00"],
          classification: { method: "quantile" as const, classCount: 2 },
          normalization: undefined,
          noData: { color: "#ccc", label: "" },
        },
      },
    } satisfies MapLayer.T;

    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });

    expect(spec.layers[0]?.paint["fill-color"]).toEqual([
      "case",
      ["==", ["get", "__avandar_state"], "suppressed"],
      "#868e96",
      ["==", ["get", "__avandar_state"], "noData"],
      "#ccc",
      ["match", ["get", "__avandar_class_index"], 0, "#fee", 1, "#f00", "#ccc"],
    ]);
  });

  it("refuses to draw an aggregate-only layer as point symbols", () => {
    const layer = MapLayer.withSensitivity(
      MapLayer.makeEmpty("Protection cases"),
      {
        mode: "aggregateOnly",
        minCellCount: 5,
        minGeoLevel: "admin2",
      },
    );
    const unsafeLayer = {
      ...layer,
      symbology: MapLayer.makeEmpty("Unsafe").symbology,
    } as MapLayer.T;
    expect(() => {
      return makeLayerSpecFromMapLayer({
        layer: unsafeLayer,
        featureCollection,
        stats: { valueDomain: undefined },
      });
    }).toThrow(/aggregate/i);
  });
});
