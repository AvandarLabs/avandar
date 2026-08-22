import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types.ts";

import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql.ts";

/**
 * DuckDB-flavoured wrapper around {@link structuredQueryToSql}. Kept for
 * historical callers; new code should prefer `structuredQueryToSql` directly.
 */
export function toRawDuckDbQuery(
  query: PartialStructuredQuery,
  {
    castTimestampsToISO = false,
  }: {
    castTimestampsToISO?: boolean;
  } = {},
): string {
  return structuredQueryToSql(query, { castTimestampsToISO });
}
