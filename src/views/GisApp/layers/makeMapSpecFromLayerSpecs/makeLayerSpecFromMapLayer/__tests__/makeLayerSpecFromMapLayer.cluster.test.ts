import { describe, expect, it } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import {
  featureCollection,
  valueColumnId,
} from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/__tests__/makeLayerSpecFromMapLayer.fixtures";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";

describe("makeLayerSpecFromMapLayer cluster and heatmap paint", () => {
  it("renders clustered points with count and unclustered layers", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "cluster" as const,
        radiusPx: 64,
        color: { type: "single" as const, color: "#123456" },
        stroke: { width: 2, color: "#abcdef" },
      },
    };

    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });

    expect(spec.sources[`ava-map-source-${layer.id}`]).toEqual({
      type: "geojson",
      data: featureCollection,
      cluster: true,
      clusterRadius: 64,
      clusterMaxZoom: 14,
    });
    expect(spec.layers).toMatchObject([
      {
        id: `ava-map-layer-${layer.id}`,
        type: "circle",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#123456",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "point_count"],
            1,
            20,
            100,
            30,
            750,
            40,
          ],
        },
      },
      {
        id: `ava-map-layer-${layer.id}-count`,
        type: "symbol",
        filter: ["has", "point_count"],
        paint: {
          "text-color": "#1a1a1a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
        },
      },
      {
        id: `ava-map-layer-${layer.id}-unclustered`,
        type: "circle",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#123456",
          "circle-radius": MapLayer.defaultSymbolRadius,
        },
      },
    ]);
  });

  it("renders an unweighted heatmap across its configured color ramp", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "heatmap" as const,
        radiusPx: 42,
        weight: undefined,
        ramp: ["#111111", "#777777", "#eeeeee"],
      },
    };

    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
    });

    expect(spec.layers).toEqual([
      {
        id: `ava-map-layer-${layer.id}`,
        type: "heatmap",
        source: `ava-map-source-${layer.id}`,
        paint: {
          "heatmap-weight": 1,
          "heatmap-radius": 42,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0, 0, 0, 0)",
            1 / 3,
            "#111111",
            2 / 3,
            "#777777",
            1,
            "#eeeeee",
          ],
        },
      },
    ]);
  });

  it("refuses a configured heatmap weight without a resolved value column name", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "heatmap" as const,
        radiusPx: 30,
        weight: valueColumnId,
        ramp: ["#111111", "#eeeeee"],
      },
    };

    expect(() => {
      return makeLayerSpecFromMapLayer({
        layer,
        featureCollection,
        stats: { valueDomain: undefined },
      });
    }).toThrow(/value column/i);
  });

  it("coerces a configured heatmap weight to a number", () => {
    const base = MapLayer.makeEmpty("Cases");
    const layer = {
      ...base,
      symbology: {
        type: "heatmap" as const,
        radiusPx: 30,
        weight: valueColumnId,
        ramp: ["#111111", "#eeeeee"],
      },
    };

    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection,
      stats: { valueDomain: undefined },
      valueColumnName: "cases",
    });

    expect(spec.layers[0]?.paint["heatmap-weight"]).toEqual([
      "to-number",
      ["get", "cases"],
      0,
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

  it.each(["cluster", "heatmap"] as const)(
    "refuses %s paint for aggregate-only layers",
    (symbologyType) => {
      const base = MapLayer.withSensitivity(MapLayer.createArea("Cases"), {
        mode: "aggregateOnly",
        minCellCount: 5,
        minGeoLevel: "admin2",
      });
      const unsafeLayer = {
        ...base,
        symbology:
          symbologyType === "cluster"
            ? {
                type: "cluster" as const,
                radiusPx: 50,
                color: { type: "single" as const, color: "#123456" },
                stroke: { width: 1, color: "#ffffff" },
              }
            : {
                type: "heatmap" as const,
                radiusPx: 30,
                weight: undefined,
                ramp: ["#111111", "#eeeeee"],
              },
      } as MapLayer.T;

      expect(() => {
        return makeLayerSpecFromMapLayer({
          layer: unsafeLayer,
          featureCollection,
          stats: { valueDomain: undefined },
        });
      }).toThrow(SensitivityViolationError);
    },
  );
});
