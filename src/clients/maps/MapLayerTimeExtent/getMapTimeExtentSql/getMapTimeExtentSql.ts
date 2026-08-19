import { quoteSqlIdentifier } from "@avandar/utils/sql";

function _layerExtentSelect(layer: {
  sourceSql: string;
  timeColumnName: string;
}): string {
  const column = quoteSqlIdentifier(layer.timeColumnName);
  return `SELECT MIN(TRY_CAST(${column} AS TIMESTAMP)) AS extent_start, MAX(TRY_CAST(${column} AS TIMESTAMP)) AS extent_end FROM (${layer.sourceSql}) AS time_extent_source`;
}

/**
 * Builds MIN/MAX timestamp SQL for the map clock extent.
 *
 * @returns `undefined` when no participating layer remains.
 */
export function getMapTimeExtentSql(
  layers: ReadonlyArray<{ sourceSql: string; timeColumnName: string }>,
): string | undefined {
  if (layers.length === 0) {
    return undefined;
  }
  const unionSql = layers.map(_layerExtentSelect).join(" UNION ALL ");
  return `SELECT MIN(extent_start) AS extent_start, MAX(extent_end) AS extent_end FROM (${unionSql}) AS time_extent_layers`;
}
