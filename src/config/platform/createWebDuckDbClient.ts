import type { DuckDbClient } from "$/platform/types/DuckDbClient.types";

/**
 * Web-side adapter that exposes the platform-agnostic `DuckDbClient`
 * interface for consumers migrated to `usePlatform().duckDb`. The
 * legacy singleton in `src/clients/DuckDbClient/DuckDbClient.ts` has a
 * materially richer surface (csv/xlsx/parquet loaders that take a
 * `tableName`, a `QueryResult<TRow>` return shape, structured-query
 * translator coupled to `DuckDbStructuredQuery`); rather than ship a
 * lossy shim, this adapter throws with a clear pointer for any
 * migrated consumer that runs on web.
 *
 * Existing web consumers keep using the legacy client at its current
 * import path until a follow-up PR migrates them individually — the
 * `PlatformProvider`'s value is the desktop branch, which is fully
 * implemented in `shared/platform/desktop/DesktopDuckDbClient.ts`.
 */
function _notMigrated(method: string): never {
  throw new Error(
    `createWebDuckDbClient.${method}: not yet implemented on web. ` +
      `Web consumers should call the legacy DuckDbClient in ` +
      `src/clients/DuckDbClient/ directly until each call site is ` +
      `migrated to usePlatform().duckDb.`,
  );
}

/**
 * Builds the web {@link DuckDbClient} adapter. Every method throws with
 * a migration pointer; web consumers stay on the legacy `DuckDbClient`
 * singleton until they're explicitly migrated.
 */
export function createWebDuckDbClient(): DuckDbClient {
  return {
    runRawQuery: async () => {
      return _notMigrated("runRawQuery");
    },
    runStructuredQuery: async () => {
      return _notMigrated("runStructuredQuery");
    },
    loadParquetFromDatasetBlobStore: async () => {
      return _notMigrated("loadParquetFromDatasetBlobStore");
    },
    loadFromUpload: async () => {
      return _notMigrated("loadFromUpload");
    },
  };
}
