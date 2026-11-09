import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

function _withSpatialFilter(
  options: Readonly<{
    layer: MapLayer.T;
    spatialFilterLayerId: MapLayer.Id | undefined;
  }>,
): MapLayer.T {
  const { layer, spatialFilterLayerId } = options;
  if (layer.spatialFilter?.layerId === spatialFilterLayerId) {
    return layer;
  }
  return {
    ...layer,
    spatialFilter: spatialFilterLayerId
      ? { layerId: spatialFilterLayerId }
      : undefined,
  };
}

/** Spatial filter updates for a map layer. */
export const spatialFilterUpdates = {
  /**
   * Keeps only features inside the given layer's polygons, or clears the
   * filter when the id is `undefined`.
   */
  withSpatialFilter: _withSpatialFilter,
};
