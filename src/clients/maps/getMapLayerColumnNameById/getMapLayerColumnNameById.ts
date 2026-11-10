import { propEq } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * The name a layer's query results give one of its query columns, which is
 * the feature property name that column becomes.
 *
 * @param layer The layer whose query reads the column.
 * @param columnId The query column to name.
 * @returns The column's derived name, or undefined when the layer does not
 * query it.
 */
export function getMapLayerColumnNameById(
  layer: MapLayer.T,
  columnId: QueryColumn.Id,
): string | undefined {
  const column = layer.source.queryColumns.find(propEq("id", columnId));
  return column ? QueryColumn.getDerivedColumnName(column) : undefined;
}
