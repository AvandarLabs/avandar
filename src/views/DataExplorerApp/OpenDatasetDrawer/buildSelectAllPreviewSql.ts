import { quoteSqlIdentifier } from "@utils";

/**
 * Builds a `SELECT * FROM "<datasetId>" LIMIT 100` query used by the Data
 * Explorer when opening a non-derived dataset (CSV, XLSX, Google Sheets,
 * open data). Quotes the identifier so dataset UUIDs with dashes and
 * non-identifier characters work as DuckDB table names.
 */
export function buildSelectAllPreviewSql(datasetId: string): string {
  return `SELECT * FROM ${quoteSqlIdentifier(datasetId)} LIMIT 100`;
}
