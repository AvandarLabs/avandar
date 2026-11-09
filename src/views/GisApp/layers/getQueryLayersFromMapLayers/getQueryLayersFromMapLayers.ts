import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * True when "all fields" in the layer's popup should fetch every source
 * column: an exact layer that draws one feature per row from an
 * unaggregated query. A displaced layer never qualifies, since its exact
 * coordinates or addresses would then show in its popup.
 */
function _shouldQueryAllSourceColumns(layer: MapLayer.T): boolean {
  const bindingType = layer.geoBinding?.type;
  return (
    layer.popup.columnIds === "all" &&
    layer.sensitivity.mode === "exact" &&
    (bindingType === "geometryColumn" || bindingType === "latLngColumns") &&
    Object.keys(layer.source.aggregations).length === 0
  );
}

/** `layer` with every source column added to its query, when it qualifies. */
function _withPopupAllColumnsQueried(layer: MapLayer.T): MapLayer.T {
  if (!_shouldQueryAllSourceColumns(layer)) {
    return layer;
  }
  const queriedBaseIds = new Set(
    layer.source.queryColumns.map((column) => {
      return column.baseColumn.id;
    }),
  );
  const missingColumns = (layer.source.sourceColumns ?? []).filter((column) => {
    return !queriedBaseIds.has(column.baseColumn.id);
  });
  if (missingColumns.length === 0) {
    return layer;
  }
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [...layer.source.queryColumns, ...missingColumns],
    },
  };
}

/**
 * The layers as their data queries run them. A popup set to all fields
 * would otherwise fetch only the columns the binding selected (for a
 * geometry column layer, just the geometry), leaving the popup and the
 * feature list empty, so an exact row layer also queries every hydrated
 * source column. The added columns keep their source ids, so query keys
 * stay stable.
 *
 * This is for running queries only. Never save its result: the saved map
 * keeps the columns its author chose, so a layer later set to Displace
 * stops querying the extra columns at once. Used by `useGisAppRendering`
 * and `useFeatureListQuery`.
 */
export function getQueryLayersFromMapLayers(
  layers: readonly MapLayer.T[],
): MapLayer.T[] {
  return layers.map(_withPopupAllColumnsQueried);
}
