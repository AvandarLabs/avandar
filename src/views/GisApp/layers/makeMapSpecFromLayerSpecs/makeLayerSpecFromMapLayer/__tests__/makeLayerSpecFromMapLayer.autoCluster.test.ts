import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { valueColumnId } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/__tests__/makeLayerSpecFromMapLayer.fixtures";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { CLUSTER_AUTO_THRESHOLD } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.constants";

/** Builds a point feature collection with the given number of features. */
function _makePointFeatureCollection(
  featureCount: number,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: Array.from({ length: featureCount }, (_, index) => {
      return {
        type: "Feature",
        id: index,
        geometry: { type: "Point", coordinates: [index % 180, 0] },
        properties: {},
      };
    }),
  };
}

describe("makeLayerSpecFromMapLayer auto-clustering", () => {
  it("clusters a circle-symbology point layer above the threshold, carrying its configured radius to the unclustered layer", () => {
    // A deliberately non-default radius: asserting the default would pass
    // even if the unclustered layer ignored the layer's own configuration
    // and fell back to a hardcoded size.
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      symbology: {
        type: "circle" as const,
        radius: 17,
        color: { type: "single" as const, color: "#123456" },
        stroke: { width: 1, color: "#ffffff" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: _makePointFeatureCollection(
        CLUSTER_AUTO_THRESHOLD + 1,
      ),
      stats: { valueDomain: undefined },
    });

    expect(spec.sources[`ava-map-source-${layer.id}`]).toMatchObject({
      cluster: true,
      clusterRadius: MapLayer.defaultClusterRadiusPx,
    });
    expect(
      spec.layers.map(({ type }) => {
        return type;
      }),
    ).toEqual(["circle", "symbol", "circle"]);
    expect(spec.layers[1]?.layout?.["text-field"]).toEqual([
      "get",
      "point_count_abbreviated",
    ]);
    expect(spec.layers[2]?.paint["circle-radius"]).toBe(17);
  });

  it("does not cluster a circle-symbology point layer at or below the threshold", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: _makePointFeatureCollection(CLUSTER_AUTO_THRESHOLD),
      stats: { valueDomain: undefined },
    });

    expect(spec.sources[`ava-map-source-${layer.id}`]).toEqual({
      type: "geojson",
      data: expect.objectContaining({ type: "FeatureCollection" }),
    });
    expect(spec.layers).toHaveLength(1);
    expect(spec.layers[0]?.type).toBe("circle");
  });

  it("never auto-clusters a proportionalSymbol layer, since size there encodes a value rather than a count", () => {
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
      featureCollection: _makePointFeatureCollection(
        CLUSTER_AUTO_THRESHOLD + 1,
      ),
      stats: { valueDomain: [0, 100] },
      valueColumnName: "cases",
    });

    expect(spec.sources[`ava-map-source-${layer.id}`]).toEqual({
      type: "geojson",
      data: expect.objectContaining({ type: "FeatureCollection" }),
    });
    expect(spec.layers).toHaveLength(1);
    expect(spec.layers[0]?.type).toBe("circle");
    expect(spec.layers[0]?.paint["circle-color"]).toBe("#ef4444");
  });

  it("never clusters a fill layer regardless of feature count", () => {
    const base = MapLayer.createArea("Districts");
    const layer = {
      ...base,
      symbology: {
        type: "fill" as const,
        color: { type: "single" as const, color: "#123456" },
        stroke: { width: 2, color: "#abcdef" },
        opacity: 0.6,
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: _makePointFeatureCollection(
        CLUSTER_AUTO_THRESHOLD + 1,
      ),
      stats: { valueDomain: undefined },
    });

    expect(spec.sources[`ava-map-source-${layer.id}`]).toEqual({
      type: "geojson",
      data: expect.objectContaining({ type: "FeatureCollection" }),
    });
    expect(
      spec.layers.some((layerSpec) => {
        return layerSpec.type === "circle" || layerSpec.type === "symbol";
      }),
    ).toBe(false);
  });

  it("clusters an explicit cluster symbology below the auto-cluster threshold", () => {
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      symbology: {
        type: "cluster" as const,
        radiusPx: 64,
        color: { type: "single" as const, color: "#123456" },
        stroke: { width: 2, color: "#abcdef" },
      },
    };
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: _makePointFeatureCollection(1),
      stats: { valueDomain: undefined },
    });

    expect(spec.sources[`ava-map-source-${layer.id}`]).toMatchObject({
      cluster: true,
      clusterRadius: 64,
    });
  });

  it("does not mutate the layer's persisted symbology when auto-clustering", () => {
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      symbology: Object.freeze({
        type: "circle" as const,
        radius: 6,
        color: { type: "single" as const, color: "#123456" },
        stroke: { width: 1, color: "#ffffff" },
      }),
    };

    expect(() => {
      makeLayerSpecFromMapLayer({
        layer,
        featureCollection: _makePointFeatureCollection(
          CLUSTER_AUTO_THRESHOLD + 1,
        ),
        stats: { valueDomain: undefined },
      });
    }).not.toThrow();
    expect(layer.symbology.type).toBe("circle");
    expect(layer.symbology.radius).toBe(6);
  });
});
