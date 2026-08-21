import { prop } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it } from "vitest";
import { renderHook } from "@/test-utils";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { useAvaMapRender } from "@/views/GisApp/layers/useAvaMapRender/useAvaMapRender";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";

/**
 * `useAvaMapRender` splices the annotation MapSpec at `annotationsZIndex`
 * and exposes annotation fill, line, and symbol ids for hit-testing.
 */

const POLYGON_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: 0,
      geometry: {
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
      },
      properties: {},
    },
  ],
};

const ANNOTATION_LAYER_IDS = [
  "ava-map-annotations-fill",
  "ava-map-annotations-line",
  "ava-map-annotations-symbol",
] as const;

function _makeBoundFillLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Districts"),
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

function _makeReadyQueryState(
  featureCollection: GeoJSON.FeatureCollection,
): MapLayerQueryState {
  return {
    data: {
      type: "spatial",
      featureCollection,
      diagnostics: {
        sourceCount: featureCollection.features.length,
        parsedCount: featureCollection.features.length,
        invalidCount: 0,
        observedFamilies: ["polygon"],
        hasMixedFamilies: false,
      },
    },
    isLoading: false,
    isRefreshing: false,
    error: undefined,
    refetch: () => {
      return undefined;
    },
  };
}

function _makeMapConfig(options: {
  layer: MapLayer.T;
  annotations: AvaMapConfig.AnnotationLayer;
  annotationsZIndex: number;
}): AvaMapConfig.T {
  return {
    ...AvaMapConfig.makeEmpty(),
    layers: [options.layer],
    annotations: options.annotations,
    annotationsZIndex: options.annotationsZIndex,
  };
}

describe("useAvaMapRender annotations", () => {
  it("puts annotations below a data layer when annotationsZIndex is 0", () => {
    const layer = _makeBoundFillLayer();
    const { result } = renderHook(() => {
      return useAvaMapRender({
        mapConfig: _makeMapConfig({
          layer,
          annotations: { isVisible: true, features: [_makeTextAnnotation()] },
          annotationsZIndex: 0,
        }),
        layerQueryStates: new Map([
          [layer.id, _makeReadyQueryState(POLYGON_COLLECTION)],
        ]),
      });
    });
    const layerIds = result.current.spec.layers.map(prop("id"));

    expect(layerIds.slice(0, 3)).toEqual([...ANNOTATION_LAYER_IDS]);
    expect(layerIds).toContain(MapLayerIds.toLayerId(layer.id));
    expect(layerIds.indexOf(MapLayerIds.toLayerId(layer.id))).toBeGreaterThan(
      layerIds.indexOf(ANNOTATION_LAYER_IDS[2]),
    );
  });

  it("includes annotation fill, line, and symbol ids when visible", () => {
    const layer = _makeBoundFillLayer();
    const { result } = renderHook(() => {
      return useAvaMapRender({
        mapConfig: _makeMapConfig({
          layer,
          annotations: { isVisible: true, features: [_makeTextAnnotation()] },
          annotationsZIndex: 1,
        }),
        layerQueryStates: new Map([
          [layer.id, _makeReadyQueryState(POLYGON_COLLECTION)],
        ]),
      });
    });

    expect(result.current.interactiveLayerIds).toEqual(
      expect.arrayContaining([...ANNOTATION_LAYER_IDS]),
    );
  });

  it("omits annotation ids from hit-testing when the overlay is hidden", () => {
    const layer = _makeBoundFillLayer();
    const { result } = renderHook(() => {
      return useAvaMapRender({
        mapConfig: _makeMapConfig({
          layer,
          annotations: { isVisible: false, features: [_makeTextAnnotation()] },
          annotationsZIndex: 1,
        }),
        layerQueryStates: new Map([
          [layer.id, _makeReadyQueryState(POLYGON_COLLECTION)],
        ]),
      });
    });

    const annotationLayers = result.current.spec.layers.filter((layerSpec) => {
      return ANNOTATION_LAYER_IDS.some((layerId) => {
        return layerId === layerSpec.id;
      });
    });

    expect(result.current.interactiveLayerIds).not.toEqual(
      expect.arrayContaining([...ANNOTATION_LAYER_IDS]),
    );
    expect(
      annotationLayers.every((layerSpec) => {
        return layerSpec.layout?.visibility === "none";
      }),
    ).toBe(true);
  });

  it("does not emit circle layers for aggregate-only fill with annotations", () => {
    const layer = MapLayer.withSensitivity(_makeBoundFillLayer(), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "admin2",
    });
    const { result } = renderHook(() => {
      return useAvaMapRender({
        mapConfig: _makeMapConfig({
          layer,
          annotations: { isVisible: true, features: [_makeTextAnnotation()] },
          annotationsZIndex: 1,
        }),
        layerQueryStates: new Map([
          [layer.id, _makeReadyQueryState(POLYGON_COLLECTION)],
        ]),
      });
    });

    expect(
      result.current.spec.layers.some((layerSpec) => {
        return layerSpec.type === "circle";
      }),
    ).toBe(false);
    expect(
      result.current.spec.layers.map((layerSpec) => {
        return layerSpec.type;
      }),
    ).toContain("symbol");
  });
});
