import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

import { propEq } from "@avandar/utils";

/** True when `column` is already in the layer's selected query columns. */
export function hasQueryColumn(
  options: Readonly<{ layer: MapLayer.T; column: QueryColumn.T }>,
): boolean {
  const { layer, column } = options;
  return layer.source.queryColumns.some(propEq("id", column.id));
}
