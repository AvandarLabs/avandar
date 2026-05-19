import type { DatasetBlobStore } from "$/platform/types/DatasetBlobStore.types";

/**
 * Web-side adapter for the platform-agnostic `DatasetBlobStore`
 * interface. The current web stack reads/writes datasets via Dexie +
 * scattered storage clients in `src/clients/storage/`; there is no
 * single existing module that fits this interface cleanly. Rather than
 * synthesise a lossy wrapper, this adapter throws with a migration
 * pointer for any consumer that resolves it through `usePlatform()`
 * — existing web call sites continue using their direct imports until
 * a follow-up PR migrates them.
 */
function _notMigrated(method: string): never {
  throw new Error(
    `createWebDatasetBlobStore.${method}: not yet implemented on web. ` +
      `Web dataset bytes live in Dexie + Supabase Storage today; the ` +
      `unified DatasetBlobStore shape applies to the desktop branch ` +
      `for now. Migrate each consumer when its read/write site is ` +
      `next touched.`,
  );
}

/**
 * Builds the web {@link DatasetBlobStore} adapter. All methods throw
 * until consumers are migrated; the desktop branch
 * (`shared/platform/desktop/DesktopDatasetBlobStore.ts`) is the live
 * implementation.
 */
export function createWebDatasetBlobStore(): DatasetBlobStore {
  return {
    put: async () => {
      return _notMigrated("put");
    },
    get: async () => {
      return _notMigrated("get");
    },
    delete: async () => {
      return _notMigrated("delete");
    },
    exists: async () => {
      return _notMigrated("exists");
    },
    list: async () => {
      return _notMigrated("list");
    },
    stat: async () => {
      return _notMigrated("stat");
    },
  };
}
