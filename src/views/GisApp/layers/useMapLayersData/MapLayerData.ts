import { propEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** True when the layer's query returns every column a point binding names. */
function _isPointBindingComplete(
  layer: MapLayer.T,
  points: MapLayer.PointBinding,
): boolean {
  const hasColumn = (columnId: QueryColumn.Id | undefined): boolean => {
    return (
      columnId !== undefined &&
      layer.source.queryColumns.some(propEq("id", columnId))
    );
  };
  return points.type === "geometryColumn" ?
      hasColumn(points.column)
    : hasColumn(points.latitude) && hasColumn(points.longitude);
}

/** Queryability and cache-key helpers for map-layer data. */
export const MapLayerData = {
  /** True when the layer has a data source and a resolvable geo binding. */
  isQueryable: (layer: MapLayer.T): boolean => {
    if (layer.source.dataSource === undefined) {
      return false;
    }
    const binding = layer.geoBinding;
    if (binding?.type === "geometryColumn") {
      return layer.source.queryColumns.some(propEq("id", binding.column));
    }
    if (binding?.type === "binPointsToGrid") {
      return _isPointBindingComplete(layer, binding.points);
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
  getQueryKeyFromMapLayer: (
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
