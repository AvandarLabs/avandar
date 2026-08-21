import { hasQueryColumn } from "./hasQueryColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * Adds `column` to the layer's query if it is not already selected. Columns a
 * layer binds to must be part of its query, or it yields no column names.
 */
export function withQueryColumn(
  options: Readonly<{ layer: MapLayer.T; column: QueryColumn.T }>,
): MapLayer.T {
  const { layer, column } = options;
  if (hasQueryColumn({ layer, column })) {
    return layer;
  }
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [...layer.source.queryColumns, column],
    },
  } as MapLayer.Standard;
}
