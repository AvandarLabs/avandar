import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import type { DataExplorerAppState } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

/**
 * Try to compute a fresh SQL string from the structured query. Used by
 * manual-form actions to keep `rawSql` in sync. Returns undefined when the
 * query has no data source.
 */
function _regenerateRawSqlFromQuery(
  query: PartialStructuredQuery,
): string | undefined {
  if (query.dataSource === undefined) {
    return undefined;
  }
  try {
    const sql = structuredQueryToSql(query);
    return sql || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Apply a structured-query change and also refresh `rawSql` to match,
 * marking SQL to form sync as `true`. Used by manual-form actions that
 * the user makes after opening the panel.
 *
 * Stamps `structured_change` as the origin, overwriting whatever was there.
 * That is correct for the manual-form actions this serves, whose stamp is
 * always the freshest one by the time the query runs. Two callers reach it
 * without a user editing the form: URL hydration re-stamps `url_hydration`
 * after its own dispatches in the same render, and the large-dataset
 * auto-limit in `useSyncLargeDatasetAutoLimit` deliberately reads as a
 * structured change, since the trigger union has no member for a limit the
 * system applied on the user's behalf.
 */
export function applyQueryChange(
  state: DataExplorerAppState,
  newQuery: PartialStructuredQuery,
): DataExplorerAppState {
  const newSql = _regenerateRawSqlFromQuery(newQuery);
  return {
    ...state,
    query: newQuery,
    rawSql: newSql,
    isStructuredQueryInSync: true,
    sqlSyncWarnings: [],
    queryTrigger: "structured_change",
  };
}

/**
 * Returns true when two column lists describe the same result schema —
 * same length, names, and data types, in order. Used by
 * `syncVizFromQueryResult` to avoid re-emitting state on identical refetches.
 */
export function sameColumnSchema(
  prev: readonly QueryResultColumn[] | undefined,
  next: readonly QueryResultColumn[],
): boolean {
  if (prev === undefined) {
    return next.length === 0;
  }
  if (prev.length !== next.length) {
    return false;
  }
  return next.every((b, idx) => {
    const a = prev[idx]!;
    return a.name === b.name && a.dataType === b.dataType;
  });
}
