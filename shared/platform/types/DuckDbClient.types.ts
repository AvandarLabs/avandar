/**
 * Platform-agnostic DuckDB client.
 *
 * On web this wraps duckdb-wasm in the browser. On desktop this is an IPC
 * client that talks to a native DuckDB instance running in the Bun main
 * process. Consumers depend only on this interface.
 */
export interface DuckDbClient {
  runStructuredQuery<TRow extends Record<string, unknown>>(
    query: StructuredQuery,
  ): Promise<TRow[]>;
  runRawQuery<TRow extends Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<TRow[]>;
  loadParquetFromDatasetBlobStore(datasetId: string): Promise<void>;
  loadFromUpload(
    source: UploadSource,
    options: DatasetImportOptions,
  ): Promise<DatasetImportResult>;
}

/**
 * Placeholder for the concrete structured-query AST.
 *
 * The canonical type lives in `src/clients/DuckDbClient/`; importing it from a
 * `packages/shared/` package would create a `packages/` to `src/` cycle, so
 * this placeholder loosens the argument type to `unknown`. Moving the
 * canonical type here is what removes the placeholder.
 */
export type StructuredQuery = {
  readonly _placeholder: unknown;
};

/**
 * Source of a dataset upload. Web sends a browser `File`; desktop sends a
 * filesystem path resolved by the Bun main process.
 */
export type UploadSource =
  | { kind: "browser-file"; file: File }
  | { kind: "filesystem-path"; path: string };

/**
 * Configuration for ingesting an upload into DuckDB.
 */
export type DatasetImportOptions = {
  datasetId: string;
  format: "csv" | "xlsx" | "parquet";
  delimiter?: string;
  hasHeader?: boolean;
};

/**
 * Result of a successful dataset import.
 */
export type DatasetImportResult = {
  datasetId: string;
  rowCount: number;
  schema: ReadonlyArray<{ name: string; type: string }>;
};
