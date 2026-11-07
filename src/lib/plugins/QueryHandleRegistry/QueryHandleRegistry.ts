import type { QueryHandle } from "@avandar/plugin-sdk";

type UnknownRow = Readonly<Record<string, unknown>>;

type QueryHandleRegistryApi = Readonly<{
  getOrCreate: (rows: readonly UnknownRow[]) => QueryHandle;
  getRows: (handle: QueryHandle) => readonly UnknownRow[] | undefined;
}>;

/** How many query handles the app-wide registry keeps readable at once. */
const MAX_LIVE_QUERY_HANDLES = 10;

function _evictOldestHandles(options: {
  rowsByHandle: Map<QueryHandle, readonly UnknownRow[]>;
  maxLiveHandles: number;
}): void {
  const { rowsByHandle, maxLiveHandles } = options;
  while (rowsByHandle.size > maxLiveHandles) {
    const oldestHandle = rowsByHandle.keys().next().value;
    if (oldestHandle === undefined) {
      return;
    }
    rowsByHandle.delete(oldestHandle);
  }
}

/**
 * Makes a registry that maps opaque query handles to result rows already in
 * memory, such as the app-wide `QueryHandleRegistry`. `getOrCreate` is
 * idempotent for the same rows array, so it is safe to call during render.
 * Only the `maxLiveHandles` most recently registered handles stay readable.
 * Asking again for rows whose handle was evicted registers that same handle
 * again, so the result a user is looking at never loses its handle.
 */
export function makeQueryHandleRegistry(options: {
  maxLiveHandles: number;
}): QueryHandleRegistryApi {
  const handlesByRows = new WeakMap<readonly UnknownRow[], QueryHandle>();
  const rowsByHandle = new Map<QueryHandle, readonly UnknownRow[]>();
  return {
    getOrCreate: (rows) => {
      const handle =
        handlesByRows.get(rows) ?? (crypto.randomUUID() as QueryHandle);
      if (rowsByHandle.has(handle)) {
        return handle;
      }
      handlesByRows.set(rows, handle);
      rowsByHandle.set(handle, rows);
      _evictOldestHandles({
        rowsByHandle,
        maxLiveHandles: options.maxLiveHandles,
      });
      return handle;
    },
    getRows: (handle) => {
      return rowsByHandle.get(handle);
    },
  };
}

/**
 * The app-wide query handle registry. Data Explorer registers the result rows
 * it holds, and a plugin reads them back through `fetchRows`.
 */
export const QueryHandleRegistry = makeQueryHandleRegistry({
  maxLiveHandles: MAX_LIVE_QUERY_HANDLES,
});
