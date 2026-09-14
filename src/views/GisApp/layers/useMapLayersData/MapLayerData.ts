import { propEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";
import type { MapOverlay } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";

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
  return points.type === "geometryColumn"
    ? hasColumn(points.column)
    : hasColumn(points.latitude) && hasColumn(points.longitude);
}

function _getBufferSourceQueryKey(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): unknown {
  if (layer.geoBinding?.type !== "bufferOfLayer") {
    return undefined;
  }
  const sourceId = layer.geoBinding.layerId;
  const source = stack.find(propEq("id", sourceId));
  if (!source) {
    return undefined;
  }
  return {
    id: source.id,
    source: source.source,
    geoBinding: source.geoBinding,
    sensitivity: source.sensitivity,
    timeColumn: source.timeColumn,
    applyAoiFilter: source.applyAoiFilter,
  };
}

/** Queryability and cache-key helpers for map-layer data. */
export const MapLayerData = {
  /**
   * True when the layer can compile: a resolvable binding, or a buffer whose
   * source is on the stack.
   */
  isQueryable: (
    layer: MapLayer.T,
    stack: readonly MapLayer.T[] = [],
  ): boolean => {
    if (layer.geoBinding?.type === "bufferOfLayer") {
      const sourceId = layer.geoBinding.layerId;
      return stack.some(propEq("id", sourceId));
    }
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

  /**
   * Cache key for a layer's rows, excluding display-only layer settings.
   *
   * `pointContext` carries the zoom for a lat/lng point layer, which belongs
   * in the key because a large point layer is aggregated into a zoom-sized
   * grid in SQL: without it, zooming in would keep redrawing the grid built
   * for the zoom the layer first loaded at.
   */
  getQueryKeyFromMapLayer: (
    layer: MapLayer.T,
    spatialContext?: {
      availability: DuckDbSpatialAvailability;
      zoomBand: number;
      simplificationReferenceLatitude: number;
    },
    overlay?: MapOverlay,
    stack: readonly MapLayer.T[] = [],
    pointContext?: { zoomBand: number },
  ): unknown[] => {
    const sourceKey = _getBufferSourceQueryKey(layer, stack);
    return [
      "mapLayerData",
      layer.id,
      layer.source,
      layer.geoBinding,
      layer.sensitivity,
      layer.timeColumn,
      layer.applyAoiFilter,
      layer.disputedStatusColumn,
      layer.disputedStatusValues,
      overlay?.timeRange,
      overlay?.aoi,
      ...(spatialContext ? [spatialContext] : []),
      ...(pointContext ? [pointContext] : []),
      ...(sourceKey ? [sourceKey] : []),
    ];
  },
};
