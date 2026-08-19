import { uuid } from "$/lib/uuid";
import { describe, expect, it } from "vitest";
import { makeExportMapSpec } from "@/views/GisApp/export/makeExportMapSpec/makeExportMapSpec";
import { MapChromeOverlayIds } from "@/views/GisApp/MapCanvas/useMapChromeOverlays";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";

/** The layer id shared by every screen-spec fixture's one data layer. */
function _dataLayerId(): string {
  return "layer-1";
}

/**
 * A minimal on-screen spec: one visible circle data layer whose selection
 * stroke is picked through a `feature-state` expression, exactly like the
 * real renderer produces.
 */
function _screenSpec(): MapSpec {
  const sourceId = MapLayerIds.toSourceId(_dataLayerId());
  return {
    sources: {
      [sourceId]: { type: "geojson", data: _emptyCollection() },
    },
    layers: [
      {
        id: MapLayerIds.toLayerId(_dataLayerId()),
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 6,
          "circle-color": "#123456",
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "isSelected"], false],
            "#ffd700",
            "#ffffff",
          ],
        },
      },
    ],
  };
}

/** A screen spec that also carries the AOI dashed-outline chrome. */
function _screenSpecWithAoiChrome(): MapSpec {
  const base = _screenSpec();
  return {
    sources: {
      ...base.sources,
      [MapChromeOverlayIds.aoiSource]: {
        type: "geojson",
        data: _emptyCollection(),
      },
    },
    layers: [
      ...base.layers,
      {
        id: MapChromeOverlayIds.aoiLineLayer,
        type: "line",
        source: MapChromeOverlayIds.aoiSource,
        paint: { "line-color": "#ea580c" },
      },
    ],
  };
}

/** A screen spec that also carries the measure overlay chrome. */
function _screenSpecWithMeasureChrome(): MapSpec {
  const base = _screenSpec();
  return {
    sources: {
      ...base.sources,
      [MapChromeOverlayIds.measureSource]: {
        type: "geojson",
        data: _emptyCollection(),
      },
    },
    layers: [
      ...base.layers,
      {
        id: MapChromeOverlayIds.measureLineLayer,
        type: "line",
        source: MapChromeOverlayIds.measureSource,
        paint: { "line-color": "#2563eb" },
      },
      {
        id: MapChromeOverlayIds.measureFillLayer,
        type: "fill",
        source: MapChromeOverlayIds.measureSource,
        paint: { "fill-color": "#2563eb" },
      },
    ],
  };
}

/** A text annotation feature, matching the persisted annotation shape. */
function _textAnnotation(): AvaMapConfig.AnnotationFeature {
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "text",
    geometry: { type: "Point", coordinates: [0, 0] },
    text: "Note",
    sizePx: 12,
    color: "#000000",
  };
}

/** A screen spec that also carries the persisted annotation overlay. */
function _screenSpecWithAnnotations(): MapSpec {
  const base = _screenSpec();
  return {
    sources: {
      ...base.sources,
      [MapLayerIds.annotationSource]: {
        type: "geojson",
        data: _emptyCollection(),
      },
    },
    layers: [
      ...base.layers,
      {
        id: MapLayerIds.annotationSymbolLayer,
        type: "symbol",
        source: MapLayerIds.annotationSource,
        paint: {},
      },
    ],
  };
}

/** A screen spec whose data layer is hidden via `layout.visibility`. */
function _screenSpecWithHiddenLayer(): MapSpec {
  const base = _screenSpec();
  return {
    sources: base.sources,
    layers: base.layers.map((layer) => {
      return { ...layer, layout: { visibility: "none" as const } };
    }),
  };
}

/** A screen spec whose data layer carries a disputed dashed casing. */
function _screenSpecWithDisputedCasing(): MapSpec {
  const base = _screenSpec();
  const sourceId = MapLayerIds.toSourceId(_dataLayerId());
  return {
    sources: base.sources,
    layers: [
      ...base.layers,
      {
        id: `${MapLayerIds.toLayerId(_dataLayerId())}-disputed-casing`,
        type: "line",
        source: sourceId,
        paint: { "line-color": "#6b7280", "line-dasharray": [3, 2] },
      },
    ],
  };
}

/** A fill-only spec, as an aggregate-only layer must always produce. */
function _aggregateOnlyScreenSpec(): MapSpec {
  const sourceId = MapLayerIds.toSourceId(_dataLayerId());
  return {
    sources: {
      [sourceId]: { type: "geojson", data: _emptyCollection() },
    },
    layers: [
      {
        id: MapLayerIds.toLayerId(_dataLayerId()),
        type: "fill",
        source: sourceId,
        paint: { "fill-color": "#123456" },
      },
    ],
  };
}

function _emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

describe("makeExportMapSpec", () => {
  it("keeps visible data layers", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpec(),
      annotations: { isVisible: true, features: [] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id === MapLayerIds.toLayerId(_dataLayerId());
      }),
    ).toBe(true);
  });

  it("strips the AOI outline", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithAoiChrome(),
      annotations: { isVisible: true, features: [] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id === MapChromeOverlayIds.aoiLineLayer;
      }),
    ).toBe(false);
    expect(spec.sources[MapChromeOverlayIds.aoiSource]).toBeUndefined();
  });

  it("strips the measure overlay", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithMeasureChrome(),
      annotations: { isVisible: true, features: [] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id.startsWith(MapChromeOverlayIds.measureSource);
      }),
    ).toBe(false);
  });

  it("keeps annotations when the overlay is visible", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithAnnotations(),
      annotations: { isVisible: true, features: [_textAnnotation()] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id === MapLayerIds.annotationSymbolLayer;
      }),
    ).toBe(true);
  });

  it("omits annotations when the overlay is hidden", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithAnnotations(),
      annotations: { isVisible: false, features: [_textAnnotation()] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id === MapLayerIds.annotationSymbolLayer;
      }),
    ).toBe(false);
  });

  it("drops hidden data layers rather than exporting them invisible", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithHiddenLayer(),
      annotations: { isVisible: true, features: [] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.layout?.visibility === "none";
      }),
    ).toBe(false);
    expect(spec.layers).toHaveLength(0);
  });

  it("keeps the disputed casing", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithDisputedCasing(),
      annotations: { isVisible: true, features: [] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id.endsWith("-disputed-casing");
      }),
    ).toBe(true);
  });

  it("produces no circle, symbol, cluster, or heatmap layer from an aggregate-only spec", () => {
    const spec = makeExportMapSpec({
      spec: _aggregateOnlyScreenSpec(),
      annotations: { isVisible: false, features: [] },
    });

    expect(
      spec.layers.every((layer) => {
        return layer.type === "fill" || layer.type === "line";
      }),
    ).toBe(true);
  });

  it("carries no feature-state expression into the export", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpec(),
      annotations: { isVisible: true, features: [] },
    });

    expect(JSON.stringify(spec)).not.toContain("feature-state");
  });

  it("resolves a nested feature-state case to its fallback", () => {
    const sourceId = MapLayerIds.toSourceId(_dataLayerId());
    const nestedSpec: MapSpec = {
      sources: {
        [sourceId]: { type: "geojson", data: _emptyCollection() },
      },
      layers: [
        {
          id: MapLayerIds.toLayerId(_dataLayerId()),
          type: "circle",
          source: sourceId,
          paint: {
            "circle-radius": 6,
            "circle-color": [
              "case",
              ["boolean", ["feature-state", "isHovered"], false],
              "#ff0000",
              [
                "case",
                ["boolean", ["feature-state", "isSelected"], false],
                "#ffd700",
                "#123456",
              ],
            ],
          },
        },
      ],
    };

    const spec = makeExportMapSpec({
      spec: nestedSpec,
      annotations: { isVisible: true, features: [] },
    });

    expect(spec.layers[0]?.paint["circle-color"]).toBe("#123456");
    expect(JSON.stringify(spec)).not.toContain("feature-state");
  });

  it("prunes a source no remaining layer references", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithAoiChrome(),
      annotations: { isVisible: true, features: [] },
    });

    expect(Object.keys(spec.sources)).toEqual([
      MapLayerIds.toSourceId(_dataLayerId()),
    ]);
  });
});
