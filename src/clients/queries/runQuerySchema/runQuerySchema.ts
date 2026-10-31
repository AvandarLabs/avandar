import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import { normalizeSqlForSubquery } from "@/lib/sql/normalizeSqlForSubquery";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

/**
 * Reads unfiltered metadata through the execution service without user-query
 * analytics.
 */
export async function runQuerySchema(
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
