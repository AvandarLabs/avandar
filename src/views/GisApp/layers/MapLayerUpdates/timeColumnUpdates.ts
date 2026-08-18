import { isMapTimeColumn } from "@/views/GisApp/layers/isMapTimeColumn/isMapTimeColumn";
import { hasQueryColumn } from "./hasQueryColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** Binds a query column as the layer's time filter, or clears it. */
function _withTimeColumn(
  options: Readonly<{
    layer: MapLayer.T;
    column: QueryColumn.T | undefined;
  }>,
): MapLayer.T {
  const { layer, column } = options;
  if (column === undefined) {
    return layer.timeColumn === undefined ?
        layer
      : { ...layer, timeColumn: undefined };
  }
  if (!isMapTimeColumn(column) || !hasQueryColumn({ layer, column })) {
    return layer;
  }
  if (layer.timeColumn === column.id) {
    return layer;
  }
  return { ...layer, timeColumn: column.id };
}

/** Time-column bindings for the layer inspector. */
export const timeColumnUpdates = { withTimeColumn: _withTimeColumn };
