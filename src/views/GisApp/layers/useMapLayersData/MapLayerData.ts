import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Queryability and cache-key helpers for map-layer data. */
export const MapLayerData = {
  /** True when the layer has a data source and a resolvable geo binding. */
  isQueryable: (layer: MapLayer.T): boolean => {
    if (layer.source.dataSource === undefined) {
      return false;
    }
    const binding = layer.geoBinding;
    if (binding?.type === "geometryColumn") {
      return layer.source.queryColumns.some((column) => {
        return column.id === binding.column;
      });
    }
    if (
      binding?.type === "joinToBoundaries" ||
      binding?.type === "aggregatePointsToBoundaries"
    ) {
      return true;
    }
    return MapLayer.toGeoBinding(layer) !== undefined;
  },

  /** Cache key for a layer's rows, excluding display-only layer settings. */
  toQueryKey: (
    layer: MapLayer.T,
    spatialContext?: {
      availability: string;
      zoomBand: number;
      simplificationReferenceLatitude: number;
    },
  ): unknown[] => {
    return [
      "mapLayerData",
      layer.id,
      layer.source,
      layer.geoBinding,
      layer.sensitivity,
      ...(spatialContext ? [spatialContext] : []),
    ];
  },
};
