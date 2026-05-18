import { defineIpcContract } from "$/platform/ipc/contracts/defineIpcContract.ts";

/**
 * Native DuckDB (via the `duckdb` Node binding loaded under Bun in main) IPC
 * contracts. Replaces the in-webview `duckdb-wasm` path on desktop; the
 * Bun-main handlers live in `apps/desktop/main/ipc/duckdb.ts` and call into
 * the service at `apps/desktop/main/services/DuckDb.ts` (Phase 2 Task 10).
 */
export const DuckDbContracts = {
  runRawQuery: defineIpcContract<
    { sql: string; params: unknown[] },
    { rows: Array<Record<string, unknown>> }
  >("duckdb.runRawQuery"),
  loadParquetFromDatasetBlobStore: defineIpcContract<
    { datasetId: string },
    { tableName: string }
  >("duckdb.loadParquetFromDatasetBlobStore"),
  loadFromSourcePath: defineIpcContract<
    {
      sourcePath: string;
      datasetId: string;
      format: "csv" | "xlsx" | "parquet";
    },
    {
      datasetId: string;
      rowCount: number;
      parquetBlobKey: string;
    }
  >("duckdb.loadFromSourcePath"),
} as const;
