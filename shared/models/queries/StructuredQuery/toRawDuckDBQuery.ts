import { structuredQueryToSQL } from "$/models/queries/StructuredQuery/structuredQueryToSQL/structuredQueryToSQL.ts";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

/**
 * DuckDB-flavoured wrapper around {@link structuredQueryToSQL}. Kept for
 * historical callers; new code should prefer `structuredQueryToSQL` directly.
 */
export function toRawDuckDBQuery(
  query: PartialStructuredQuery,
  {
    castTimestampsToISO = false,
  }: {
    castTimestampsToISO?: boolean;
  } = {},
): string {
  return structuredQueryToSQL(query, { castTimestampsToISO });
}
