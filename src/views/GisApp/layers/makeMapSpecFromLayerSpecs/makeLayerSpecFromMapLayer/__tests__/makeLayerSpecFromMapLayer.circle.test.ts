import { objectKeys, prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";

import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import {
  featureCollection,
  valueColumnId,
} from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/__tests__/makeLayerSpecFromMapLayer.fixtures";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";

describe("makeLayerSpecFromMapLayer circle paint", () => {
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
});
