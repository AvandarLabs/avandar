import { normalizeSqlForSubquery } from "@avandar/utils/sql";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

/**
 * Returns the columns (names and data types) a chart's SQL produces, without
 * reading any rows, so dashboard charts can bind each column to a column ID.
 * Runs the SQL with no dashboard filters, wrapped in `LIMIT 0`, through
 * `runStructuredQuery`, and records no query analytics.
 */
export async function runColumnSchemaQuery(
  options: Readonly<{
    rawSql: string;
    auth: StructuredQueryAuth;
  }>,
): Promise<QueryResult.Column[]> {
  const result = await runStructuredQuery({
    ...options.auth,
    query: StructuredQuery.makeEmpty(),
    rawSql: `SELECT * FROM (${normalizeSqlForSubquery(options.rawSql)}) AS "_ava_schema" LIMIT 0`,
  });
  return result.columns;
}
