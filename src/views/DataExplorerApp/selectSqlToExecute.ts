import { structuredQueryToSQL } from "$/models/queries/StructuredQuery/structuredQueryToSQL";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

type Params = {
  rawSQL: string | undefined;
  isStructuredQueryInSync: boolean;
  executionQuery: PartialStructuredQuery;
};

/**
 * Picks the SQL string the data-explorer should execute.
 *
 * When `rawSQL` is set we run it verbatim — direct SQL edits and
 * LLM-generated SQL are sacrosanct and must not be tampered with by
 * structured-form-derived rewrites (including the large-dataset auto LIMIT).
 *
 * Otherwise we fall back to SQL generated from the structured form, but only
 * when the form is in sync with a selected data source.
 */
export function selectSqlToExecute(params: Params): string | undefined {
  const { rawSQL, isStructuredQueryInSync, executionQuery } = params;
  if (rawSQL !== undefined) {
    return rawSQL;
  }
  if (isStructuredQueryInSync && executionQuery.dataSource !== undefined) {
    return structuredQueryToSQL(executionQuery) || undefined;
  }
  return undefined;
}
