import { isDefined } from "@avandar/utils";
import { useEffect } from "react";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { isClosedRingValid } from "@/views/GisApp/tools/isClosedRingValid/isClosedRingValid";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

/** MapLibre source and layer ids reserved for canvas chrome, never MapSpec. */
export const MapChromeOverlayIds = {
  aoiSource: "ava-map-aoi-outline",
  aoiLineLayer: "ava-map-aoi-outline-line",
  measureSource: "ava-map-measure",
  measureLineLayer: "ava-map-measure-line",
  measureFillLayer: "ava-map-measure-fill",
  annotationPreviewSource: "ava-map-annotation-preview",
  annotationPreviewLineLayer: "ava-map-annotation-preview-line",
} as const;

const AOI_LINE_PAINT = {
  "line-color": "#ea580c",
  "line-width": 2,
  "line-dasharray": [2, 2],
};

const MEASURE_LINE_PAINT = {
  "line-color": "#2563eb",
  "line-width": 2,
} as const;

const MEASURE_FILL_PAINT = {
  "fill-color": "#2563eb",
  "fill-opacity": 0.12,
} as const;

const ANNOTATION_PREVIEW_LINE_PAINT = {
  "line-color": AvaMapConfig.GisWaveDDefaults.annotationColor,
  "line-width": AvaMapConfig.GisWaveDDefaults.annotationStrokeWidthPx,
} as const;

function _lineFeature(
  coordinates: ReadonlyArray<readonly [number, number]>,
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: coordinates.map((vertex) => {
        return [...vertex];
      }),
    },
    properties: {},
  };
}

function _polygonFeature(
  coordinates: ReadonlyArray<readonly [number, number]>,
): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        coordinates.map((vertex) => {
          return [...vertex];
        }),
      ],
    },
    properties: {},
  };
}

function _upsertGeoJsonSource(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJSON.FeatureCollection,
): void {
  const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (existingSource) {
    existingSource.setData(data);
    return;
  }
  map.addSource(sourceId, { type: "geojson", data });
}

function _makeAoiOutlineCollection(options: {
  aoi: AvaMapConfig.AoiPolygon | undefined;
  inProgressVertices: ReadonlyArray<[number, number]>;
}): GeoJSON.FeatureCollection {
  const committedRing = options.aoi?.coordinates[0];
  const features = [
    committedRing && committedRing.length >= 2
      ? _lineFeature(committedRing)
      : undefined,
    options.inProgressVertices.length >= 2
      ? _lineFeature(options.inProgressVertices)
      : undefined,
  ].filter(isDefined);
  return { type: "FeatureCollection", features };
}

function _makeMeasureCollection(
  vertices: ReadonlyArray<[number, number]>,
): GeoJSON.FeatureCollection {
  const features = [
    vertices.length >= 2 ? _lineFeature(vertices) : undefined,
    isClosedRingValid(vertices) ? _polygonFeature(vertices) : undefined,
  ].filter(isDefined);
  return { type: "FeatureCollection", features };
}

function _upsertAoiOutline(
  map: MapLibreMap,
  data: GeoJSON.FeatureCollection,
): void {
  _upsertGeoJsonSource(map, MapChromeOverlayIds.aoiSource, data);
  if (!map.getLayer(MapChromeOverlayIds.aoiLineLayer)) {
    map.addLayer({
      id: MapChromeOverlayIds.aoiLineLayer,
      type: "line",
      source: MapChromeOverlayIds.aoiSource,
      paint: AOI_LINE_PAINT,
    });
  }
  map.moveLayer(MapChromeOverlayIds.aoiLineLayer);
}

function _ensureMeasureLayers(map: MapLibreMap): void {
  if (!map.getLayer(MapChromeOverlayIds.measureFillLayer)) {
    map.addLayer({
      id: MapChromeOverlayIds.measureFillLayer,
      type: "fill",
      source: MapChromeOverlayIds.measureSource,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: MEASURE_FILL_PAINT,
    });
  }
  if (!map.getLayer(MapChromeOverlayIds.measureLineLayer)) {
    map.addLayer({
      id: MapChromeOverlayIds.measureLineLayer,
      type: "line",
      source: MapChromeOverlayIds.measureSource,
      paint: MEASURE_LINE_PAINT,
    });
  }
  map.moveLayer(MapChromeOverlayIds.measureFillLayer);
  map.moveLayer(MapChromeOverlayIds.measureLineLayer);
}

function _makeAnnotationPreviewCollection(
  vertices: ReadonlyArray<[number, number]>,
): GeoJSON.FeatureCollection {
  const features = vertices.length >= 2 ? [_lineFeature(vertices)] : [];
  return { type: "FeatureCollection", features };
}

function _upsertAnnotationPreviewOverlay(
  map: MapLibreMap,
  data: GeoJSON.FeatureCollection,
): void {
  _upsertGeoJsonSource(map, MapChromeOverlayIds.annotationPreviewSource, data);
  if (!map.getLayer(MapChromeOverlayIds.annotationPreviewLineLayer)) {
    map.addLayer({
      id: MapChromeOverlayIds.annotationPreviewLineLayer,
      type: "line",
      source: MapChromeOverlayIds.annotationPreviewSource,
      paint: ANNOTATION_PREVIEW_LINE_PAINT,
    });
  }
  map.moveLayer(MapChromeOverlayIds.annotationPreviewLineLayer);
}

function _upsertMeasureOverlay(
  map: MapLibreMap,
  data: GeoJSON.FeatureCollection,
): void {
  _upsertGeoJsonSource(map, MapChromeOverlayIds.measureSource, data);
  _ensureMeasureLayers(map);
}

function _liveMap(options: {
  mapRef: MapInstance["mapRef"];
  styleLoadCount: number;
  isStyleSwapPendingRef: MapInstance["isStyleSwapPendingRef"];
}): MapLibreMap | undefined {
  const map = options.mapRef.current;
  if (
    !map ||
    options.styleLoadCount === 0 ||
    options.isStyleSwapPendingRef.current
  ) {
    return undefined;
  }
  return map;
}

type AoiChromeOverlayOptions = {
  mapInstance: MapInstance;
  spec: MapSpec;
  aoi: AvaMapConfig.AoiPolygon | undefined;
  inProgressVertices: ReadonlyArray<[number, number]>;
};

function useAoiChromeOverlay(options: AoiChromeOverlayOptions): void {
  const { mapRef, styleLoadCount, isStyleSwapPendingRef } = options.mapInstance;
  useEffect(
    function upsertAoiChromeOverlay() {
      const map = _liveMap({ mapRef, styleLoadCount, isStyleSwapPendingRef });
      if (!map) {
        return;
      }
      _upsertAoiOutline(
        map,
        _makeAoiOutlineCollection({
          aoi: options.aoi,
          inProgressVertices: options.inProgressVertices,
        }),
      );
    },
    [
      isStyleSwapPendingRef,
      mapRef,
      options.aoi,
      options.inProgressVertices,
      options.spec,
      styleLoadCount,
    ],
  );
}

function useMeasureChromeOverlay(options: {
  mapInstance: MapInstance;
  spec: MapSpec;
  measureVertices: ReadonlyArray<[number, number]>;
}): void {
  const { mapRef, styleLoadCount, isStyleSwapPendingRef } = options.mapInstance;
  useEffect(
    function upsertMeasureChromeOverlay() {
      const map = _liveMap({ mapRef, styleLoadCount, isStyleSwapPendingRef });
      if (!map) {
        return;
      }
      _upsertMeasureOverlay(
        map,
        _makeMeasureCollection(options.measureVertices),
      );
    },
    [
      isStyleSwapPendingRef,
      mapRef,
      options.measureVertices,
      options.spec,
      styleLoadCount,
    ],
  );
}

function useAnnotationPreviewOverlay(options: {
  mapInstance: MapInstance;
  spec: MapSpec;
  annotationPreviewVertices: ReadonlyArray<[number, number]>;
}): void {
  const { mapRef, styleLoadCount, isStyleSwapPendingRef } = options.mapInstance;
  useEffect(
    function upsertAnnotationPreviewOverlay() {
      const map = _liveMap({ mapRef, styleLoadCount, isStyleSwapPendingRef });
      if (!map) {
        return;
      }
      _upsertAnnotationPreviewOverlay(
        map,
        _makeAnnotationPreviewCollection(options.annotationPreviewVertices),
      );
    },
    [
      isStyleSwapPendingRef,
      mapRef,
      options.annotationPreviewVertices,
      options.spec,
      styleLoadCount,
    ],
  );
}

type ChromeOverlayOptions = {
  mapInstance: MapInstance;
  spec: MapSpec;
  aoi: AvaMapConfig.AoiPolygon | undefined;
  inProgressVertices: ReadonlyArray<[number, number]>;
  annotationPreviewVertices: ReadonlyArray<[number, number]>;
  measureVertices: ReadonlyArray<[number, number]>;
};

/**
 * Upserts dashed AOI, solid measure, and annotation-preview chrome.
 *
 * AOI, measure, and annotation-preview ids must never be placed in
 * `MapSpec`; `syncMap` ignores them. Persisted annotation MapSpec ids
 * (`ava-map-annotations*`) stay off this list.
 */
export function useMapChromeOverlays(options: ChromeOverlayOptions): void {
  useAoiChromeOverlay(options);
  useMeasureChromeOverlay(options);
  useAnnotationPreviewOverlay(options);
}
