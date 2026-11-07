import { PluginError } from "@avandar/plugin-sdk";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import type { FetchRowsResult, QueryHandle } from "@avandar/plugin-sdk";

/** Rows returned when a plugin does not pass a limit. */
export const DEFAULT_FETCH_ROWS_LIMIT = 50_000;

/** The most rows one `fetchRows` call returns. */
export const MAX_FETCH_ROWS_LIMIT = 200_000;

function _clampLimit(requestedLimit: number | undefined): number {
  const flooredLimit = Math.floor(requestedLimit ?? DEFAULT_FETCH_ROWS_LIMIT);
  return Math.min(Math.max(flooredLimit, 1), MAX_FETCH_ROWS_LIMIT);
}

/**
 * Implements `avandar.data.fetchRows` under `data:context`: only the handle
 * of the current invocation is readable, and only the requested columns are
 * returned. A limit above `MAX_FETCH_ROWS_LIMIT` is clamped to it.
 */
export function fetchRowsForInvocation(options: {
  invocationHandle: QueryHandle;
  queryHandle: QueryHandle;
  columns: readonly string[];
  limit?: number;
}): FetchRowsResult {
  const { invocationHandle, queryHandle, columns } = options;
  if (queryHandle !== invocationHandle) {
    throw new PluginError(
      "PermissionDenied",
      "fetchRows only accepts the query handle of the current invocation.",
    );
  }
  const rows = QueryHandleRegistry.getRows(queryHandle);
  if (rows === undefined) {
    throw new PluginError(
      "InvalidHandle",
      "This query result is no longer available. Run the command again.",
    );
  }
  const limit = _clampLimit(options.limit);
  const projectedRows = rows.slice(0, limit).map((row) => {
    return Object.fromEntries(
      columns.map((column) => {
        return [column, row[column]];
      }),
    );
  });
  return { rows: projectedRows, isTruncated: rows.length > limit };
}
