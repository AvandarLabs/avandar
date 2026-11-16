import { PluginError } from "@avandar/plugin-sdk";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import type { FetchRowsResult, QueryHandle } from "@avandar/plugin-sdk";

/** Rows returned when a plugin does not pass a limit. */
export const DEFAULT_FETCH_ROWS_LIMIT = 50_000;

/** The most rows one `fetchRows` call returns. */
export const MAX_FETCH_ROWS_LIMIT = 200_000;

function _clampLimit(requestedLimit: number | undefined): number {
  const flooredLimit = Math.floor(requestedLimit ?? DEFAULT_FETCH_ROWS_LIMIT);
  const limit = Number.isNaN(flooredLimit)
    ? DEFAULT_FETCH_ROWS_LIMIT
    : flooredLimit;
  return Math.min(Math.max(limit, 1), MAX_FETCH_ROWS_LIMIT);
}

/**
 * Implements `avandar.data.fetchRows` under `data:context`: only the handle
 * of the current invocation, or a handle `querySlot` issued during it, is
 * readable (an issued handle whose rows were evicted is `InvalidHandle`),
 * and only the requested columns are returned, read from each row's own
 * properties. A limit above `MAX_FETCH_ROWS_LIMIT` is clamped to
 * it, and a NaN limit is treated as not provided.
 */
export function fetchRowsForInvocation(options: {
  invocationHandle: QueryHandle;
  queryHandle: QueryHandle;
  columns: readonly string[];
  limit?: number;

  /** Rows of a handle `querySlot` issued in this invocation, else undefined. */
  getSlotRows?: (
    handle: QueryHandle,
  ) => ReadonlyArray<Readonly<Record<string, unknown>>> | undefined;

  /** Whether `querySlot` issued the handle here, evicted or not. */
  wasSlotHandleIssued?: (handle: QueryHandle) => boolean;
}): FetchRowsResult {
  const { invocationHandle, queryHandle, columns } = options;
  const isInvocationHandle = queryHandle === invocationHandle;
  const isSlotHandle =
    !isInvocationHandle && options.wasSlotHandleIssued?.(queryHandle) === true;
  if (!isInvocationHandle && !isSlotHandle) {
    throw new PluginError(
      "PermissionDenied",
      "fetchRows only accepts a query handle of the current invocation.",
    );
  }
  const rows = isSlotHandle
    ? options.getSlotRows?.(queryHandle)
    : QueryHandleRegistry.getRows(queryHandle);
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
        return [column, Object.hasOwn(row, column) ? row[column] : undefined];
      }),
    );
  });
  return { rows: projectedRows, isTruncated: rows.length > limit };
}
