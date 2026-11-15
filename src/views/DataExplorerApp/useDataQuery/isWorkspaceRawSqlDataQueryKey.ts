import { isPlainObject } from "@avandar/utils";
import type { QueryKey } from "@tanstack/react-query";

/**
 * The literal that sits just before the raw SQL in a `useDataQuery` query
 * key: `[queryAuth, query, RAW_SQL_KEY_MARKER, rawSql, ...]`.
 */
export const RAW_SQL_KEY_MARKER = "rawSql";

/**
 * Whether `queryKey` belongs to a `useDataQuery` run of `rawSql` against
 * `workspaceId`. Lets code outside the hook find the query the Data Explorer
 * started for a given statement without rebuilding the rest of the key.
 */
export function isWorkspaceRawSqlDataQueryKey(
  queryKey: QueryKey,
  options: Readonly<{ workspaceId: string; rawSql: string }>,
): boolean {
  const [queryAuth, , rawSqlMarker, keyRawSql] = queryKey;
  return (
    rawSqlMarker === RAW_SQL_KEY_MARKER &&
    keyRawSql === options.rawSql &&
    isPlainObject(queryAuth) &&
    queryAuth.auth === "workspace" &&
    queryAuth.workspaceId === options.workspaceId
  );
}
