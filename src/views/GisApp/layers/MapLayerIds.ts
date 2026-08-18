/**
 * The MapLibre id naming scheme for a map layer's source and layer.
 *
 * Both halves live together so they cannot drift apart: `syncMap` matches
 * layers by these ids, and the canvas routes clicks through them.
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
};
