import { uuid } from "$/lib/uuid.ts";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { describe, expect, it } from "vitest";

/** An area layer with a polygon geometry binding. */
function _makePolygonLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Cases"),
    geoBinding: {
      type: "geometryColumn",
      column: uuid<QueryColumn.Id>(),
      encoding: "geojson",
      family: "polygon",
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
}

/** A text annotation at a point. */
function _makeTextAnnotation(): AvaMapConfig.AnnotationFeature {
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "text",
    geometry: { type: "Point", coordinates: [29.2, -1.7] },
    text: "Goma",
    sizePx: 14,
    color: "#3b82f6",
  };
}
describe("overlay updaters", () => {
  it("rejects a reversed time range", () => {
    expect(() => {
      return AvaMapConfig.withTimeRange({
        config: AvaMapConfig.makeEmpty(),
        timeRange: {
          start: "2026-02-01T00:00:00.000Z",
          end: "2026-01-01T00:00:00.000Z",
        },
      });
    }).toThrow("Time range end must not precede start");
  });

  it("allows an unset or equal time range", () => {
    const empty = AvaMapConfig.makeEmpty();
    expect(
      AvaMapConfig.withTimeRange({ config: empty, timeRange: undefined })
        .timeRange,
    ).toBeUndefined();
    const instant = "2026-01-01T00:00:00.000Z";
    expect(
      AvaMapConfig.withTimeRange({
        config: empty,
        timeRange: { start: instant, end: instant },
      }).timeRange,
    ).toEqual({ start: instant, end: instant });
  });

  it("sets and clears the AOI polygon", () => {
    const polygon: AvaMapConfig.AoiPolygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    const withAoi = AvaMapConfig.withAoi({
      config: AvaMapConfig.makeEmpty(),
      aoi: polygon,
    });
    expect(withAoi.aoi).toEqual(polygon);
    expect(
      AvaMapConfig.withAoi({ config: withAoi, aoi: undefined }).aoi,
    ).toBeUndefined();
  });

  it("clamps annotationsZIndex to 0..=layers.length", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: MapLayer.makeEmpty("A"),
    });
    expect(
      AvaMapConfig.withAnnotationsZIndex({ config, annotationsZIndex: 9 })
        .annotationsZIndex,
    ).toBe(1);
  });

  it("leaves annotationsZIndex unchanged when adding a layer", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: MapLayer.makeEmpty("A"),
    });
    expect(config.annotationsZIndex).toBe(0);
  });

  it("appends an annotation and leaves an empty layer when the last is removed", () => {
    const feature = _makeTextAnnotation();
    const withFeature = AvaMapConfig.withAnnotationFeature({
      config: AvaMapConfig.makeEmpty(),
      feature,
    });
    expect(withFeature.annotations.features).toEqual([feature]);
    expect(
      AvaMapConfig.withoutAnnotationFeature({
        config: withFeature,
        featureId: feature.id,
      }).annotations,
    ).toEqual({ isVisible: true, features: [] });
  });

  it("replaces one annotation with zero or more features at the same index", () => {
    const first = _makeTextAnnotation();
    const second = _makeTextAnnotation();
    const replacement = _makeTextAnnotation();
    const config = AvaMapConfig.withAnnotationFeature({
      config: AvaMapConfig.withAnnotationFeature({
        config: AvaMapConfig.makeEmpty(),
        feature: first,
      }),
      feature: second,
    });
    const split = AvaMapConfig.withAnnotationFeaturesReplaced({
      config,
      featureId: first.id,
      nextFeatures: [replacement],
    });
    expect(
      split.annotations.features.map((feature) => {
        return feature.id;
      }),
    ).toEqual([replacement.id, second.id]);
    expect(
      AvaMapConfig.withAnnotationFeaturesReplaced({
        config: split,
        featureId: replacement.id,
        nextFeatures: [],
      }).annotations.features.map((feature) => {return feature.id}),
    ).toEqual([second.id]);
  });
});

describe("withBufferLayerInserted", () => {
  it("inserts a buffer layer above the source and copies sensitivity", () => {
    const source = _makePolygonLayer();
    const withSource = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: source,
    });
    const nextConfig = AvaMapConfig.withBufferLayerInserted({
      config: withSource,
      sourceLayerId: source.id,
      distanceMeters: 1000,
      dissolve: false,
      name: "Buffer of Cases",
    });
    const buffer = nextConfig.layers[nextConfig.layers.indexOf(source) + 1];
    expect(buffer?.geoBinding).toEqual({
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 1000,
      dissolve: false,
    });
    expect(buffer?.sensitivity.mode).toBe(source.sensitivity.mode);
    expect(buffer?.id).not.toBe(source.id);
  });

  it("rejects a buffer when the source layer is missing or unbound", () => {
    expect(() => {
      return AvaMapConfig.withBufferLayerInserted({
        config: AvaMapConfig.makeEmpty(),
        sourceLayerId: uuid<MapLayer.Id>(),
        distanceMeters: 1000,
        dissolve: false,
        name: "Buffer of Missing",
      });
    }).toThrow("Cannot insert a buffer of a missing or unbound layer");
    const unbound = MapLayer.makeEmpty("Unbound");
    const withUnbound = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: unbound,
    });
    expect(() => {
      return AvaMapConfig.withBufferLayerInserted({
        config: withUnbound,
        sourceLayerId: unbound.id,
        distanceMeters: 1000,
        dissolve: false,
        name: "Buffer of Unbound",
      });
    }).toThrow("Cannot insert a buffer of a missing or unbound layer");
  });

  it("clamps buffer distance to 100..=1_000_000 meters", () => {
    const source = _makePolygonLayer();
    const withSource = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: source,
    });
    const tooSmall = AvaMapConfig.withBufferLayerInserted({
      config: withSource,
      sourceLayerId: source.id,
      distanceMeters: 1,
      dissolve: false,
      name: "Near",
    });
    const tooLarge = AvaMapConfig.withBufferLayerInserted({
      config: withSource,
      sourceLayerId: source.id,
      distanceMeters: 5_000_000,
      dissolve: false,
      name: "Far",
    });
    expect(tooSmall.layers[1]?.geoBinding).toMatchObject({
      distanceMeters: 100,
    });
    expect(tooLarge.layers[1]?.geoBinding).toMatchObject({
      distanceMeters: 1_000_000,
    });
  });

  it("increments annotationsZIndex when the overlay sits above the source", () => {
    const source = _makePolygonLayer();
    const withSource = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: source,
    });
    const withOverlayOnTop = AvaMapConfig.withAnnotationsZIndex({
      config: withSource,
      annotationsZIndex: 1,
    });
    const nextConfig = AvaMapConfig.withBufferLayerInserted({
      config: withOverlayOnTop,
      sourceLayerId: source.id,
      distanceMeters: 1000,
      dissolve: false,
      name: "Buffer of Cases",
    });
    expect(nextConfig.annotationsZIndex).toBe(2);
  });

  it("keeps an aggregate-only buffer as fill", () => {
    const source = MapLayer.withSensitivity(_makePolygonLayer(), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });
    const withSource = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: source,
    });
    const nextConfig = AvaMapConfig.withBufferLayerInserted({
      config: withSource,
      sourceLayerId: source.id,
      distanceMeters: 1000,
      dissolve: false,
      name: "Buffer of Cases",
    });
    const buffer = nextConfig.layers[1];
    expect(buffer?.sensitivity.mode).toBe("aggregateOnly");
    expect(buffer?.symbology.type).toBe("fill");
  });
});
