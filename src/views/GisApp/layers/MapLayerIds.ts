import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * The MapLibre id naming scheme for data-layer sources and layers, plus the
 * persisted annotation overlay which also lives in MapSpec.
 *
 * These ids live together so they cannot drift apart: `syncMap` matches
 * layers by them, and the canvas routes clicks through them.
 */
export const MapLayerIds = {
  /** The MapLibre source id for a layer id. */
  toSourceId: (layerId: string): string => {
    return `ava-map-source-${layerId}`;
  },

  /** The MapLibre layer id for a layer id. */
  toLayerId: (layerId: string): string => {
    return `ava-map-layer-${layerId}`;
  },

  /** The MapLibre layer id for an unclustered point. */
  getUnclusteredLayerIdFromLayerId: (layerId: string): string => {
    return `ava-map-layer-${layerId}-unclustered`;
  },

  /** The MapLibre layer id for a cluster's count label. */
  getClusterCountLayerIdFromLayerId: (layerId: string): string => {
    return `ava-map-layer-${layerId}-count`;
  },

  /** MapLibre id of a layer's dashed disputed-boundary casing. */
  toDisputedCasingLayerId: (layerId: MapLayer.Id): string => {
    return `${MapLayerIds.toLayerId(layerId)}-disputed-casing`;
  },

  /** GeoJSON source for the persisted annotation overlay. */
  annotationSource: "ava-map-annotations",

  /** Fill paint for area annotations. */
  annotationFillLayer: "ava-map-annotations-fill",

  /** Line paint for arrow, freehand, and area outlines. */
  annotationLineLayer: "ava-map-annotations-line",

  /** Symbol paint for text annotations. */
  annotationSymbolLayer: "ava-map-annotations-symbol",
};
