import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Queryability and cache-key helpers for map-layer data. */
export const MapLayerData = {
  /** True when the layer has a data source and a resolvable geo binding. */
  isQueryable: (layer: MapLayer.T): boolean => {
    return (
      layer.source.dataSource !== undefined &&
      MapLayer.toGeoBinding(layer) !== undefined
    );
  },

  /**
   * Cache key for a layer's rows, excluding display-only layer settings.
   */
  makeQueryKey: (layer: MapLayer.T): readonly unknown[] => {
    return ["mapLayerData", layer.id, layer.source, layer.geoBinding];
  },
};
