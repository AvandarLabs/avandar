import type { QueryHandle } from "@avandar/plugin-sdk";

type UnknownRow = Readonly<Record<string, unknown>>;

type QueryHandleRegistryApi = Readonly<{
  getOrCreate: (rows: readonly UnknownRow[]) => QueryHandle;
  getRows: (handle: QueryHandle) => readonly UnknownRow[] | undefined;
  /**
   * Forgets one handle and its rows, leaving every other handle readable.
   * Registering the same rows again issues a new handle.
   */
  release: (handle: QueryHandle) => void;
  clear: () => void;
}>;

/** How many query handles the app-wide registry keeps readable at once. */
export const MAX_LIVE_QUERY_HANDLES = 3;

function _evictOldestHandles(options: {
  rowsByHandle: Map<QueryHandle, readonly UnknownRow[]>;
  maxLiveHandles: number;
}): void {
  const { rowsByHandle, maxLiveHandles } = options;
  const numHandlesToEvict = Math.max(0, rowsByHandle.size - maxLiveHandles);
  [...rowsByHandle.keys()]
    .slice(0, numHandlesToEvict)
    .forEach((oldestHandle) => {
      rowsByHandle.delete(oldestHandle);
    });
}

/**
 * Makes a registry that maps opaque query handles to result rows already in
 * memory, such as the app-wide `QueryHandleRegistry`. `getOrCreate` is
 * idempotent for the same rows array, so it is safe to call during render.
 * Only the `maxLiveHandles` most recently registered handles stay readable,
 * `release` drops one, and `clear` drops them all. Asking again for rows
 * whose handle was evicted or cleared registers that same handle again, so
 * the result a user is looking at never loses its handle. Rows whose handle
 * was released get a new handle.
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
    release: (handle) => {
      const rows = rowsByHandle.get(handle);
      if (rows) {
        handlesByRows.delete(rows);
      }
      rowsByHandle.delete(handle);
    },
    clear: () => {
      rowsByHandle.clear();
    },
  };
}

/**
 * The app-wide query handle registry. Data Explorer registers the result rows
 * a plugin command runs on when the command is clicked, a plugin reads them
 * back through `fetchRows`, and `PluginHost` clears it when it unmounts.
 */
export const QueryHandleRegistry = makeQueryHandleRegistry({
  maxLiveHandles: MAX_LIVE_QUERY_HANDLES,
});
