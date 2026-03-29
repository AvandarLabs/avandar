/**
 * DuckDB logical types produced when sniffing CSVs with auto-detect (subset we
 * persist in transform metadata and Parquet conversion).
 */
export type DuckDBSniffableDataType =
  | "BOOLEAN"
  | "BIGINT"
  | "DOUBLE"
  | "TIME"
  | "DATE"
  | "TIMESTAMP"
  | "VARCHAR";

/**
 * Passed to DuckDB `sniff_csv(..., sample_size=...)` as the detection sample
 * bound (see NodeDuckDB.sniffCSV).
 */
export const SNIFF_CSV_MAX_ROWS = 10_000;

const _INTEGER_FAMILY = new Set<string>([
  "TINYINT",
  "SMALLINT",
  "INTEGER",
  "INT",
  "BIGINT",
  "HUGEINT",
  "UTINYINT",
  "USMALLINT",
  "UINTEGER",
  "UBIGINT",
  "UHUGEINT",
]);

/**
 * Maps a DuckDB `DESCRIBE` `column_type` string to a sniffable type.
 */
export function duckDBDescribeColumnTypeToSniffable(
  columnType: string,
): DuckDBSniffableDataType {
  const trimmed = columnType.trim();
  if (trimmed === "") {
    throw new Error("Empty DuckDB column_type for CSV sniff.");
  }

  const upper = trimmed.toUpperCase();

  if (upper.startsWith("TIMESTAMP")) {
    return "TIMESTAMP";
  }

  if (upper.startsWith("TIME")) {
    return "TIME";
  }

  const baseToken = upper.match(/^([A-Z_]+)/u)?.[1] ?? upper;

  if (_INTEGER_FAMILY.has(baseToken)) {
    return "BIGINT";
  }

  if (
    baseToken === "FLOAT" ||
    baseToken === "DOUBLE" ||
    baseToken === "REAL" ||
    baseToken === "DECIMAL"
  ) {
    return "DOUBLE";
  }

  if (baseToken === "BOOLEAN") {
    return "BOOLEAN";
  }

  if (baseToken === "DATE") {
    return "DATE";
  }

  if (baseToken === "VARCHAR" || baseToken === "CHAR" || baseToken === "UUID") {
    return "VARCHAR";
  }

  return "VARCHAR";
}
