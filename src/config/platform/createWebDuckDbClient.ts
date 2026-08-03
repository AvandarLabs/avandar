import { DuckDbClient as LegacyDuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  DatasetImportOptions,
  DatasetImportResult,
  DuckDbClient,
  StructuredQuery,
  UploadSource,
} from "$/platform/types/DuckDbClient.types";

/**
 * Web-side adapter that wraps the legacy `DuckDbClient` singleton
 * (`src/clients/DuckDbClient/DuckDbClient.ts`) behind the platform-agnostic
 * `DuckDbClient` interface. Consumers reached through `usePlatform().duckDb`
 * use this on web; the legacy singleton stays directly callable for code
 * that still imports it.
 *
 * The platform interface is narrower than the legacy surface (no
 * `returnType: 'parquet'`, no shared `conn`, positional params instead of
 * named `$param$` templates). For the small set of legacy features the
 * platform interface does not cover, callers that need them continue to
 * import the legacy singleton directly until the platform interface is
 * widened.
 */

function _safeTableName(datasetId: string): string {
  // Mirrors the desktop-side scrub in
  // `apps/desktop/main/ipc/registerDuckDbHandlers/registerDuckDbHandlers.ts`.
  return `ds_${datasetId.replace(/[^a-z0-9_]/gi, "_")}`;
}

async function runRawQuery<TRow extends Record<string, unknown>>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<TRow[]> {
  if (params.length > 0) {
    throw new Error(
      "createWebDuckDbClient.runRawQuery: positional params are not " +
        "supported on web. Inline the value into the SQL or call the " +
        "legacy DuckDbClient with named `$param$` templates.",
    );
  }
  const result = await LegacyDuckDbClient.runRawQuery<TRow>(sql);
  return result.data;
}

async function runStructuredQuery<TRow extends Record<string, unknown>>(
  query: StructuredQuery,
): Promise<TRow[]> {
  // The platform `StructuredQuery` is a placeholder (`{_placeholder:
  // unknown}`); the legacy client's structured-query AST is the canonical
  // shape. Cast through and trust the caller is passing the right thing —
  // the same arrangement the desktop adapter makes.
  type LegacyArg = Parameters<typeof LegacyDuckDbClient.runStructuredQuery>[0];
  const result = await LegacyDuckDbClient.runStructuredQuery<TRow>(
    query as unknown as LegacyArg,
  );
  return result.data;
}

async function loadParquetFromDatasetBlobStore(
  datasetId: string,
): Promise<void> {
  // Web has no separate blob store yet; the legacy paths register the
  // parquet bytes directly with duckdb-wasm at the call site (see
  // `LocalPublicDatasetRawDataClient.ts`). Throw with a clear pointer so
  // a migrated consumer that hits this on web surfaces the gap loudly.
  throw new Error(
    `createWebDuckDbClient.loadParquetFromDatasetBlobStore(${datasetId}): ` +
      "no web blob-store-backed parquet loader yet. Web callers still " +
      "use DatasetParquetStorageClient + DuckDbClient.loadParquet at " +
      "their call sites.",
  );
}

async function loadFromUpload(
  source: UploadSource,
  options: DatasetImportOptions,
): Promise<DatasetImportResult> {
  if (source.kind !== "browser-file") {
    throw new Error(
      "createWebDuckDbClient.loadFromUpload: filesystem paths are " +
        "desktop-only. Web must pass a browser `File`.",
    );
  }
  const tableName = _safeTableName(options.datasetId);
  if (options.format === "csv") {
    const result = await LegacyDuckDbClient.loadCsv({
      tableName,
      file: source.file,
      delimiter: options.delimiter,
      hasHeader: options.hasHeader,
    });
    return {
      datasetId: options.datasetId,
      rowCount: result.numRows,
      schema: result.columns.map((col) => {
        return { name: col.column_name, type: String(col.column_type) };
      }),
    };
  }
  if (options.format === "xlsx") {
    const result = await LegacyDuckDbClient.loadXlsx({
      tableName,
      file: source.file,
    });
    return {
      datasetId: options.datasetId,
      rowCount: result.numRows,
      schema: result.columns.map((col) => {
        return { name: col.column_name, type: String(col.column_type) };
      }),
    };
  }
  if (options.format === "parquet") {
    const result = await LegacyDuckDbClient.loadParquet({
      tableName,
      blob: source.file,
    });
    return {
      datasetId: options.datasetId,
      rowCount: result.numRows,
      schema: result.columns.map((col) => {
        return { name: col.column_name, type: String(col.column_type) };
      }),
    };
  }
  // Exhaustiveness guard — the union is closed at the type level.
  const exhaustive: never = options.format;
  throw new Error(`Unsupported format: ${String(exhaustive)}`);
}

/**
 * Builds the web {@link DuckDbClient} adapter. Methods forward to the
 * legacy `DuckDbClient` singleton; legacy-only features (named params,
 * `returnType: 'parquet'`, shared connection) throw with a pointer to
 * the legacy import path.
 */
export function createWebDuckDbClient(): DuckDbClient {
  return {
    runRawQuery,
    runStructuredQuery,
    loadParquetFromDatasetBlobStore,
    loadFromUpload,
  };
}
