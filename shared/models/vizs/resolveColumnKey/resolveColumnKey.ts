import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types.ts";

import { propEq } from "@avandar/utils";

/**
 * Resolve a viz config column key (a column name) against the columns of a
 * current `QueryResult`. Used by hydration helpers when a saved viz config
 * may reference column names from an older query result whose schema has
 * shifted.
 *
 * Resolution ladder:
 *
 *   1. Exact name match → return the canonical name as-is.
 *   2. Case-insensitive name match → return the canonical name from
 *      `columns` (so persisted config converges on the current casing).
 *   3. No match → return `undefined` so the caller can drop the key from
 *      the persisted config and the settings UI stays in sync with what
 *      actually renders.
 */
export function resolveColumnKey(
  key: string | undefined,
  columns: readonly QueryResultColumn[],
): string | undefined {
  if (key === undefined) {
    return undefined;
  }
  return (
    columns.find(propEq("name", key))?.name ??
    columns.find((col) => {
      return col.name.toLowerCase() === key.toLowerCase();
    })?.name
  );
}
