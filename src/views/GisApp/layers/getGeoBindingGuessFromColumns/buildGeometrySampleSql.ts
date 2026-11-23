import { quoteSqlIdentifier } from "@avandar/utils/sql";

/** How many rows a geometry-format guess reads from the source. */
const GEOMETRY_SAMPLE_ROW_LIMIT = 32;

/**
 * Selects a short slice of the columns that might hold geometry.
 *
 * The binding guess reads those cells to tell WKT, WKB, and GeoJSON apart.
 */
export function buildGeometrySampleSql(
  options: Readonly<{
    tableName: string;
    columnNames: readonly string[];
  }>,
): string {
  const columns = options.columnNames.map(quoteSqlIdentifier).join(", ");
  const table = quoteSqlIdentifier(options.tableName);
  return `SELECT ${columns} FROM ${table} LIMIT ${GEOMETRY_SAMPLE_ROW_LIMIT}`;
}
