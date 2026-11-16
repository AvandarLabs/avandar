import { isDefined } from "@avandar/utils";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** The query column ids a row layer's geometry binding reads. */
function _getBoundColumnIds(layer: MapLayer.T): QueryColumn.Id[] {
  const binding = layer.geoBinding;
  if (binding?.type === "latLngColumns") {
    return [binding.latitude, binding.longitude].filter(isDefined);
  }
  if (binding?.type === "geometryColumn") {
    return [binding.column];
  }
  return [];
}

function _getBaseColumnKey(column: QueryColumn.T): string {
  return `${column.baseColumn.__type}:${column.baseColumn.id}`;
}

/**
 * The columns a ring around each of `layer`'s rows can be labelled with:
 * every queried column, then every hydrated source column the query does
 * not already read, leaving out the columns the geometry binding reads.
 * Source columns are offered only for an unaggregated query, since adding a
 * column to an aggregated one would change its groups. Empty for a layer
 * that is not drawn from rows. The ids returned are the ones a buffer's
 * `labelColumn` stores, and `getQueryLayersFromMapLayers` adds a chosen
 * source column to the layer's query.
 */
export function getBufferLabelColumnsFromMapLayer(
  layer: MapLayer.T,
): QueryColumn.T[] {
  const boundIds = new Set<QueryColumn.Id>(_getBoundColumnIds(layer));
  if (boundIds.size === 0) {
    return [];
  }
  const { queryColumns, sourceColumns, aggregations } = layer.source;
  const boundKeys = new Set(
    queryColumns
      .filter((column) => {
        return boundIds.has(column.id);
      })
      .map(_getBaseColumnKey),
  );
  const queriedKeys = new Set(queryColumns.map(_getBaseColumnKey));
  const unqueriedSourceColumns =
    Object.keys(aggregations).length === 0
      ? (sourceColumns ?? []).filter((column) => {
          return !queriedKeys.has(_getBaseColumnKey(column));
        })
      : [];
  return [...queryColumns, ...unqueriedSourceColumns].filter((column) => {
    return (
      !boundIds.has(column.id) && !boundKeys.has(_getBaseColumnKey(column))
    );
  });
}
