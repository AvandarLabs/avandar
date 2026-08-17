import { MIMEType } from "@avandar/utils";
import * as duckdb from "@duckdb/duckdb-wasm";

/**
 * Registers a CSV file in DuckDB's internal file system.
 * @param options.db The DuckDB instance to register the file with.
 * @param options.tableName The name of the table to register the dataset
 * under. This must be a valid DuckDB table name. Calling `snakeify` on the
 * string before passing it to this function would be sufficient to ensure
 * the string is a valid table name.
 * @param options.file The file to register. This takes precedence over
 * passing `fileText`.
 * @param options.fileText The raw CSV text string to register. If a `file`
 * is provided, this option will be ignored.
 */
export async function registerCsvFile(
  options:
    | { db: duckdb.AsyncDuckDB; tableName: string; file: File }
    | { db: duckdb.AsyncDuckDB; tableName: string; fileText: string },
): Promise<void> {
  const { db, tableName } = options;

  // we offer two ways a CSV can be registered: either with the file
  // handle or with the raw text
  if ("file" in options) {
    const { file } = options;
    await db.registerFileHandle(
      tableName,
      file,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true,
    );
  } else {
    const { fileText } = options;
    await db.registerFileText(tableName, fileText);
  }
}

/** Rejects workbook files that DuckDB's `read_xlsx` cannot open. */
export function assertXlsxFileReadable(file: File): void {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    return;
  }

  if (lower.endsWith(".xls")) {
    throw new Error(
      "DuckDb read_xlsx supports .xlsx only; legacy .xls is not supported.",
    );
  }

  throw new Error(`Expected an .xlsx workbook file; got "${file.name}".`);
}

/**
 * Registers an `.xlsx` workbook in DuckDB's internal file system.
 *
 * @param options.db The DuckDB instance to register the workbook with.
 * @param options.tableName The name of the table to register the dataset
 * under. This must be a valid DuckDb table name.
 * @param options.file The file to register. This takes precedence over
 * passing `fileBytes`.
 * @param options.fileBytes The raw workbook bytes to register. If a `file`
 * is provided, this option will be ignored.
 */
export async function registerXlsxFile(options: {
  db: duckdb.AsyncDuckDB;
  tableName: string;
  file?: File;
  fileBytes?: Uint8Array<ArrayBuffer>;
}): Promise<void> {
  const { db, tableName, file, fileBytes } = options;
  // BROWSER_FILEREADER lets DuckDB do random-access reads against a Blob /
  // File via `slice(...).arrayBuffer()`, avoiding a redundant full-buffer
  // copy into DuckDB's WASM heap during ingest. XLSX still gets fully
  // materialized by the caller via `CREATE TABLE AS read_xlsx(...)`, but peak
  // memory during the ingest step itself is meaningfully lower.
  if (file) {
    await db.registerFileHandle(
      tableName,
      file,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true,
    );
    return;
  }
  if (fileBytes) {
    const blob = new Blob([fileBytes], {
      type: MIMEType.APPLICATION_OPENXML_EXCEL,
    });
    await db.registerFileHandle(
      tableName,
      blob,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true,
    );
    return;
  }
  throw new Error("registerXlsxFile: expected file or fileBytes");
}

/**
 * Registers a Parquet file in DuckDB's internal file system.
 * @param options.db The DuckDB instance to register the file with.
 * @param options.tableName The name of the table to register the dataset
 * under. This must be a valid DuckDB table name.
 * @param options.blob The parquet file as a binary blob to register.
 */
export async function registerParquetFile(options: {
  db: duckdb.AsyncDuckDB;
  tableName: string;
  blob: Blob;
}): Promise<void> {
  const { db, tableName, blob } = options;
  if (blob.type !== MIMEType.APPLICATION_PARQUET) {
    throw new Error("Blob is not a parquet file");
  }
  // Register the Blob directly as a file handle rather than copying its
  // bytes into DuckDB's WASM heap. Combined with the `CREATE VIEW ... AS
  // SELECT * FROM read_parquet(...)` in `loadParquet`, this lets DuckDB
  // read only the column chunks and row groups it needs per query
  // (projection + LIMIT pushdown) by slicing byte ranges out of the Blob.
  // IDB- and fetch-backed Blobs in every modern browser are file-backed,
  // so `blob.slice(...).arrayBuffer()` reads from disk on demand and
  // does not materialize the whole parquet in JS memory. directIO is
  // false so DuckDB caches hot pages in its buffer pool (important for
  // repeated queries against the same dataset, e.g. column-by-column
  // summary generation).
  await db.registerFileHandle(
    tableName,
    blob,
    duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
    false,
  );
}

/** Reads the staging parquet file into a blob and drops both staging files. */
export async function getParquetBlobFromStagingFiles(
  options: Readonly<{
    db: duckdb.AsyncDuckDB;
    parquetStagingFile: string;
    sourceStagingFile: string;
  }>,
): Promise<Blob> {
  const { db } = options;
  const parquetBuffer = (await db.copyFileToBuffer(
    options.parquetStagingFile,
  )) as Uint8Array<ArrayBuffer>;
  const parquetData = new Blob([parquetBuffer], {
    type: MIMEType.APPLICATION_PARQUET,
  });
  await db.dropFile(options.sourceStagingFile);
  await db.dropFile(options.parquetStagingFile);
  return parquetData;
}
