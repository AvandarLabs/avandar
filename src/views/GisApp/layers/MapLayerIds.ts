/**
 * The MapLibre id naming scheme for a map layer's source and layer.
 *
 * Both halves live together so they cannot drift apart: `syncMap` matches
 * layers by these ids, and the canvas resolves clicks through them.
 */
export const MapLayerIds = {
  /** Builds the MapLibre source id for a layer. */
  buildSourceId: (layerId: string): string => {
    return `ava-map-source-${layerId}`;
  },

  /** Builds the MapLibre layer id for a layer. */
  buildLayerId: (layerId: string): string => {
    return `ava-map-layer-${layerId}`;
  },
};
