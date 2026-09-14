import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { makeMapSpecFromAnnotations } from "@/views/GisApp/layers/makeMapSpecFromAnnotations/makeMapSpecFromAnnotations";

/**
 * `makeMapSpecFromAnnotations` turns persisted annotations into one MapLibre
 * GeoJSON source and the fill, line, and symbol layers that paint them.
 */

const UNIT_SQUARE: AvaMapConfig.AoiPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
};

function _makeTextFeature(): AvaMapConfig.AnnotationFeature {
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "text",
    geometry: { type: "Point", coordinates: [29.2, -1.7] },
    text: "Goma",
    sizePx: 16,
    color: "#3b82f6",
  };
}

function _makeArrowFeature(): AvaMapConfig.AnnotationFeature {
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "arrow",
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    },
    color: "#ef4444",
    strokeWidthPx: 3,
  };
}

function _makeFreehandFeature(): AvaMapConfig.AnnotationFeature {
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "freehand",
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 0],
        [0.5, 0.2],
        [1, 0],
      ],
    },
    color: "#22c55e",
    strokeWidthPx: 2,
  };
}

function _makeAreaFeature(): AvaMapConfig.AnnotationFeature {
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "area",
    geometry: UNIT_SQUARE,
    color: "#a855f7",
    opacity: 0.4,
    stroke: { color: "#6b21a8", widthPx: 2 },
  };
}

function _makeAllKindFeatures(): AvaMapConfig.AnnotationFeature[] {
  return [
    _makeTextFeature(),
    _makeArrowFeature(),
    _makeFreehandFeature(),
    _makeAreaFeature(),
  ];
}

describe("makeMapSpecFromAnnotations", () => {
  it("puts four feature kinds in one FeatureCollection with kind and id", () => {
    const features = _makeAllKindFeatures();
    const spec = makeMapSpecFromAnnotations({
      annotations: { isVisible: true, features },
    });
    const source = spec.sources["ava-map-annotations"];
    const kinds = source?.data.features.map((feature) => {
      return feature.properties?.kind;
    });
    const ids = source?.data.features.map((feature) => {
      return feature.properties?.id;
    });

    expect(source?.data.features).toHaveLength(4);
    expect(kinds).toEqual(["text", "arrow", "freehand", "area"]);
    expect(ids).toEqual(features.map(prop("id")));
    expect(spec.layers.map(prop("type"))).toEqual(["fill", "line", "symbol"]);
    const symbolLayer = spec.layers.find((layer) => {
      return layer.type === "symbol";
    });
    expect(symbolLayer?.layout?.["text-field"]).toEqual(["get", "text"]);
    expect(symbolLayer?.layout?.["text-font"]).toEqual(["Noto Sans Regular"]);
  });

  it("hides every annotation layer when the overlay is not visible", () => {
    const spec = makeMapSpecFromAnnotations({
      annotations: { isVisible: false, features: _makeAllKindFeatures() },
    });

    expect(spec.layers).toHaveLength(3);
    expect(
      spec.layers.every((layer) => {
        return layer.layout?.visibility === "none";
      }),
    ).toBe(true);
    expect(spec.sources["ava-map-annotations"]?.data.features).toHaveLength(4);
  });

  it("copies feature coordinates without applying an overlay predicate", () => {
    const feature = _makeTextFeature();
    const spec = makeMapSpecFromAnnotations({
      annotations: { isVisible: true, features: [feature] },
    });
    const geometry =
      spec.sources["ava-map-annotations"]?.data.features[0]?.geometry;

    expect(geometry).toEqual({
      type: "Point",
      coordinates: [29.2, -1.7],
    });
  });

  it("omits a text feature that is open in the editor overlay", () => {
    const feature = _makeTextFeature();
    const spec = makeMapSpecFromAnnotations({
      annotations: { isVisible: true, features: [feature] },
      hiddenAnnotationFeatureIds: [feature.id],
    });

    expect(spec.sources["ava-map-annotations"]?.data.features).toEqual([]);
  });

  it("still returns a spec when there are no annotation features", () => {
    const spec = makeMapSpecFromAnnotations({
      annotations: { isVisible: true, features: [] },
    });

    expect(spec.sources["ava-map-annotations"]?.data).toEqual({
      type: "FeatureCollection",
      features: [],
    });
    expect(spec.layers.map(prop("id"))).toEqual([
      "ava-map-annotations-fill",
      "ava-map-annotations-line",
      "ava-map-annotations-symbol",
    ]);
  });
});
