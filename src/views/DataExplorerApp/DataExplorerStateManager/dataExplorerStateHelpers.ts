import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { DataExplorerAppState } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";

import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";

/**
 * Try to compute a fresh SQL string from the structured query. Used by
 * manual-form actions to keep `rawSql` in sync. Returns undefined when the
 * query has no data source.
 */
function _regenerateRawSqlFromQuery(
  query: StructuredQuery.Partial,
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
  options: Readonly<{
    state: DataExplorerAppState;
    newQuery: StructuredQuery.Partial;
  }>,
): DataExplorerAppState {
  const { state, newQuery } = options;
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
 * Returns true when two column lists describe the same result schema:
 * same length, names, and data types, in order. Used by
 * `syncVizFromQueryResult` to avoid re-emitting state on identical refetches.
 */
export function isSameColumnSchema(
  options: Readonly<{
    previousColumns: readonly QueryResult.Column[] | undefined;
    currentColumns: readonly QueryResult.Column[];
  }>,
): boolean {
  const { previousColumns, currentColumns } = options;
  if (previousColumns === undefined) {
    return currentColumns.length === 0;
  }
  if (previousColumns.length !== currentColumns.length) {
    return false;
  }
  return currentColumns.every((currentColumn, idx) => {
    const previousColumn = previousColumns[idx];
    return (
      previousColumn?.name === currentColumn.name &&
      previousColumn?.dataType === currentColumn.dataType
    );
  });
}
