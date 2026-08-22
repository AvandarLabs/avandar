/*
 * Webview-side adapter that satisfies the platform-agnostic
 * `DuckDbClient` interface by forwarding every call to the Bun-main
 * DuckDB IPC handlers (`apps/desktop/main/ipc/duckdb.ts`).
 *
 * Ships in isolation for now: no React code imports it yet. Soon, the
 * `PlatformProvider` and `usePlatform()` plumbing will pick this client
 * for desktop builds and the existing `duckdb-wasm` one for web.
 *
 * `runStructuredQuery` is the one remaining gap. The structured-query
 * to SQL translator lives in `src/clients/DuckDbClient/` and pulls in
 * `apache-arrow` and `knex`, both heavyweight web-only deps we
 * deliberately don't drag through `shared/`. Soon, the translator will
 * move alongside the `PlatformProvider` migration; until then we throw
 * with a clear pointer at the failing call site.
 */

import type {
  DatasetImportOptions,
  DatasetImportResult,
  DuckDbClient,
  UploadSource,
} from "$/platform/types/DuckDbClient.types.ts";

import { callIpc } from "$/platform/ipc/client.ts";
import { DuckDbContracts } from "$/platform/ipc/contracts/DuckDbContracts.ts";

async function runRawQuery<TRow extends Record<string, unknown>>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<TRow[]> {
  const reply = await callIpc(DuckDbContracts.runRawQuery, {
    sql,
    params,
  });
  return reply.rows as TRow[];
}

async function runStructuredQuery<TRow>(): Promise<TRow[]> {
  throw new Error(
    `DesktopDuckDbClient.runStructuredQuery is not implemented yet; the
     structured-query translator moves into shared/ alongside the
     PlatformProvider migration.`,
  );
}

async function loadParquetFromDatasetBlobStore(
  datasetId: string,
): Promise<void> {
  await callIpc(DuckDbContracts.loadParquetFromDatasetBlobStore, {
    datasetId,
  });
}

async function loadFromUpload(
  source: UploadSource,
  options: DatasetImportOptions,
): Promise<DatasetImportResult> {
  if (source.kind !== "filesystem-path") {
    throw new Error(
      `DesktopDuckDbClient.loadFromUpload requires a filesystem path;
       browser-file uploads must be staged via DatasetBlobStore.put first.`,
    );
  }
  const reply = await callIpc(DuckDbContracts.loadFromSourcePath, {
    sourcePath: source.path,
    datasetId: options.datasetId,
    format: options.format,
  });
  return {
    datasetId: reply.datasetId,
    rowCount: reply.rowCount,
    /*
     * For now, the column schema isn't round-tripped across the wire;
     * the RDB write of the dataset row carries the schema, so the
     * immediate consumer doesn't need it here. Soon, the parquet
     * metadata read inside the dataset blob store will fill this in.
     */
    schema: [],
  };
}

/**
 * Desktop {@link DuckDbClient} implementation that routes through IPC to
 * the native DuckDB instance in the Bun main process.
 *
 * Think of this as a 'frontend' client (because it is what we expose to React
 * in our desktop app), which then calls the 'backend' (IPC server) to
 * reach our DuckDb service (in Bun).
 */
export const DesktopDuckDbClient: DuckDbClient = {
  runRawQuery,
  runStructuredQuery,
  loadParquetFromDatasetBlobStore,
  loadFromUpload,
};
