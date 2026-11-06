import { normalizeSqlForSubquery } from "@avandar/utils/sql";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

/**
 * Returns the `QueryResult` columns, with their names and data types, that
 * some SQL produces, without reading any rows or recording query analytics.
 *
 * Use it when only a query's shape matters, for example to give each column
 * of a dashboard chart's SQL a column ID.
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
