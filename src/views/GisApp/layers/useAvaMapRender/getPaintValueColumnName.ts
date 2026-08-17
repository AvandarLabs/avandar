import { propEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** Gets the result-column name driving data-dependent point paint. */
export function getPaintValueColumnName(layer: MapLayer.T): string | undefined {
  const valueColumnId =
    layer.symbology.type === "proportionalSymbol" ? layer.symbology.value
    : layer.symbology.type === "heatmap" ? layer.symbology.weight
    : undefined;
  const valueColumn =
    valueColumnId ?
      layer.source.queryColumns.find(propEq("id", valueColumnId))
    : undefined;
  return valueColumn ?
      QueryColumn.getDerivedColumnName(valueColumn)
    : undefined;
}
