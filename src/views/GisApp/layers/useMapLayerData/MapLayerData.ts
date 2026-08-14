import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Queryability and cache-key helpers for map-layer data. */
export const MapLayerData = {
  /** True when the layer has a data source and a resolvable geo binding. */
  isQueryable: (layer: Readonly<MapLayer.T>): boolean => {
    return (
      layer.source.dataSource !== undefined &&
      MapLayer.toGeoBinding(layer) !== undefined
    );
  },

  /** Cache key for a layer's rows, excluding display-only layer settings. */
  toQueryKey: (layer: Readonly<MapLayer.T>): unknown[] => {
    return ["mapLayerData", layer.id, layer.source, layer.geoBinding];
  },
} satisfies {
  isQueryable: (layer: Readonly<MapLayer.T>) => boolean;
  toQueryKey: (layer: Readonly<MapLayer.T>) => unknown[];
};
