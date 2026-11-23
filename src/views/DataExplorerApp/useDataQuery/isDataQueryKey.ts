import { RAW_SQL_KEY_MARKER } from "@/views/DataExplorerApp/useDataQuery/isWorkspaceRawSqlDataQueryKey";
import type { QueryKey } from "@tanstack/react-query";

/**
 * Whether `queryKey` belongs to any `useDataQuery` run, whatever SQL it runs
 * and whichever session runs it. Lets code outside the hook find every data
 * query without rebuilding the rest of the key.
 */
export function isDataQueryKey(queryKey: QueryKey): boolean {
  return queryKey[2] === RAW_SQL_KEY_MARKER;
}
