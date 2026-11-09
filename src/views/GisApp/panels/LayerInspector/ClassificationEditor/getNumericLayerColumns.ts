import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * Numeric columns a graduated or categorical color can measure.
 * Selected query columns come first, then the rest of the source, so a
 * field already in the query keeps the id the layer stored.
 */
export function getNumericLayerColumns(layer: MapLayer.T): QueryColumn.T[] {
  const seenBaseIds = new Set<string>();
  return [
    ...layer.source.queryColumns,
    ...(layer.source.sourceColumns ?? []),
  ].filter((column) => {
    if (!QueryColumn.isNumeric(column)) {
      return false;
    }
    const baseId = column.baseColumn.id;
    if (seenBaseIds.has(baseId)) {
      return false;
    }
    seenBaseIds.add(baseId);
    return true;
  });
}
