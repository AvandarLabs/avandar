import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { featureCollection } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/__tests__/makeLayerSpecFromMapLayer.fixtures";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";

describe("makeLayerSpecFromMapLayer fill and line paint", () => {
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
        ...MapLayer.createDefaultFillSymbology(),
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
});
