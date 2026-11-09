import { isDefined, propEq } from "@avandar/utils";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { FetchMapLayerFeatureListOptions } from "../MapLayerFeatureList.types";

/** The query column ids a layer's geo binding reads its location from. */
function _getBoundLocationIds(layer: MapLayer.T): QueryColumn.Id[] {
  const binding = layer.geoBinding;
  if (binding?.type === "geometryColumn") {
    return [binding.column];
  }
  if (binding?.type === "latLngColumns") {
    return [binding.latitude, binding.longitude].filter(isDefined);
  }
  return [];
}

/** True when `column` is a location column of the layer, by id or source. */
function _isBoundLocationColumn(
  layer: MapLayer.T,
  column: QueryColumn.T,
): boolean {
  const boundIds = _getBoundLocationIds(layer);
  const boundBaseIds = [
    ...layer.source.queryColumns,
    ...(layer.source.sourceColumns ?? []),
  ]
    .filter((candidate) => {
      return boundIds.includes(candidate.id);
    })
    .map((candidate) => {
      return candidate.baseColumn.id;
    });
  return (
    boundIds.includes(column.id) || boundBaseIds.includes(column.baseColumn.id)
  );
}

/**
 * The query columns a feature list shows, the popup's by default. A layer's
 * bound geometry column, or bound latitude and longitude columns, are never
 * listed: they hold the location itself, which the map and popups already
 * show, and are unreadable as a cell.
 */
export function getFeatureListQueryColumns(
  layer: MapLayer.T,
  columnIds: FetchMapLayerFeatureListOptions["columnIds"],
): QueryColumn.T[] {
  const { queryColumns } = layer.source;
  const requestedIds =
    columnIds !== "popup"
      ? columnIds
      : layer.popup.columnIds === "all"
        ? queryColumns.map((column) => {
            return column.id;
          })
        : layer.popup.columnIds;
  return requestedIds
    .map((columnId) => {
      return queryColumns.find(propEq("id", columnId));
    })
    .filter(isDefined)
    .filter((column) => {
      return !_isBoundLocationColumn(layer, column);
    });
}
