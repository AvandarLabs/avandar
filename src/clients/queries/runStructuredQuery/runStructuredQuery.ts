import { runStructuredQueryWithMetadata } from "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { RunStructuredQueryParams } from "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

/**
 * {@link runStructuredQueryWithMetadata} with the analytics metadata dropped,
 * so a plain result stays a plain result at the call site.
 */
export async function runStructuredQuery(
  params: RunStructuredQueryParams,
): Promise<QueryResult.T<UnknownRow>> {
  const { result } = await runStructuredQueryWithMetadata(params);
  return result;
}
