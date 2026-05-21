import * as duckdb from "@duckdb/duckdb-wasm";
import { ILogger } from "@logger";
import {
  isNonEmptyArray,
  MIMEType,
  objectEntries,
  objectKeys,
  objectValuesMap,
  prop,
} from "@utils";
import { uuid } from "$/lib/uuid";
import { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import { DuckDBQueryAggregations } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import { QueryResultPage } from "$/models/queries/QueryResult/QueryResult.types";
import * as arrow from "apache-arrow";
import knex from "knex";
import { match } from "ts-pattern";
import {
  applyQuoteProbeToParseOptions,
  buildDuckDbCsvSniffResultFromRejectScan,
  buildDuckDbCsvSniffResultFromResolved,
  buildDuckDbCsvSniffResultFromSniffRow,
  buildReadCsvArgList,
  buildSniffCsvConstraintArgs,
  createCsvParseOptionsFromUserHints,
  CSV_SNIFF_SAMPLE_SIZE,
  DEFAULT_CSV_ESCAPE_CHAR,
  DEFAULT_CSV_QUOTE_CHAR,
  isRecoverableCsvParseError,
  MAX_CSV_PARSE_ATTEMPTS,
  mergeSniffCsvRowIntoParseOptions,
  refineCsvParseOptionsAfterFailure,
  resolveParseOptionsAfterEmptyStagingLoad,
  shouldRetryCsvParse,
} from "@/clients/DuckDbClient/csvParse";
import {
  DuckDbColumnSchema,
  DuckDbCsvSniffResult,
  DuckDbLoadCsvResult,
  DuckDbLoadParquetResult,
  DuckDbLoadXlsxResult,
  DuckDbRejectedRow,
  DuckDbScan,
  DuckDbStructuredQuery,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { buildManualDuckDbBundles } from "@/clients/DuckDbClient/duckDbManualBundles";
import { shouldLoadDuckDbNetworkExtensions } from "@/clients/DuckDbClient/shouldLoadDuckDbNetworkExtensions";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { Logger } from "@/utils/Logger";
import { arrowFieldToQueryResultField } from "./arrowFieldToQueryResultField";
import type {
  CsvParseUserHints,
  DuckDbSniffCsvRow,
} from "@/clients/DuckDbClient/csvParse";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";

const sql = knex({
  client: "sqlite3",
  wrapIdentifier: (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  },
  useNullAsDefault: true,
});

function _quoteSQLIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function _escapeSqlSingleQuotedLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

class DuckDbWasmInitCancelled extends Error {
  override readonly name = "DuckDbWasmInitCancelled";
}

function _formatDuckDbWorkerError(event: ErrorEvent): string {
  if (event.message) {
    return event.message;
  }
  if (event.error instanceof Error && event.error.message) {
    return event.error.message;
  }
  const details: string[] = [];
  if (event.filename) {
    details.push(`worker script: ${event.filename}`);
  }
  if (event.lineno > 0) {
    details.push(`line ${event.lineno}`);
  }
  if (event.colno > 0) {
    details.push(`column ${event.colno}`);
  }
  if (details.length > 0) {
    return `DuckDB worker failed to start (${details.join(", ")})`;
  }
  return "DuckDB worker failed to start";
}

/**
 * DuckDB-WASM clears pending requests on worker `error` without rejecting
 * `instantiate()`, which leaves dataset imports spinning forever.
 */
function _waitForDuckDbWorkerFailure(worker: Worker): Promise<never> {
  return new Promise((_resolve, reject) => {
    worker.addEventListener(
      "error",
      (event: ErrorEvent) => {
        reject(
          new Error(
            `${_formatDuckDbWorkerError(event)}. ` +
              "If this persists after a hard refresh, restart the dev server.",
          ),
        );
      },
      { once: true },
    );
    worker.addEventListener(
      "messageerror",
      () => {
        reject(
          new Error(
            "DuckDB worker failed to start (message deserialization error). " +
              "If this persists after a hard refresh, restart the dev server.",
          ),
        );
      },
      { once: true },
    );
  });
}

function _assertXlsxFileReadable(file: File): void {
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

type BaseDuckDbLoadCsvOptions = {
  tableName: string;
  numRowsToSkip?: number;
  delimiter?: string;
  quoteChar?: string;
  escapeChar?: string;
  newlineDelimiter?: string;
  commentChar?: string;
  hasHeader?: boolean;
  dateFormat?: string;
  timestampFormat?: string;
  columns?: Array<readonly [columnName: string, columnType: DuckDbDataType]>;
};

export type DuckDbLoadCsvOptions =
  | (BaseDuckDbLoadCsvOptions & { file: File })
  | (BaseDuckDbLoadCsvOptions & { fileText: string });

type BaseDuckDbLoadXlsxOptions = {
  tableName: string;
  /**
   * Worksheet name for `read_xlsx`. Omit to load the first sheet (DuckDb
   * default).
   */
  sheet?: string;
  /**
   * When true, `read_xlsx` uses the first row as column names. Defaults to
   * true so behavior matches the import UI and avoids flaky auto-detection.
   */
  hasHeader?: boolean;
};

/**
 * Options for `loadXlsx`. Pass either a browser `File` or raw workbook bytes
 * (`.xlsx` only; DuckDb does not read `.xls`).
 */
export type DuckDbLoadXlsxOptions =
  | (BaseDuckDbLoadXlsxOptions & { file: File })
  | (BaseDuckDbLoadXlsxOptions & { fileBytes: Uint8Array<ArrayBuffer> });

/**
 * An object representing a row with unknown column types.
 * This is very similar to `UnknownObject` except that keys can only be strings.
 */
export type UnknownRow = Record<string, unknown>;

function _csvParseUserHintsFromLoadOptions(
  options: BaseDuckDbLoadCsvOptions,
): CsvParseUserHints {
  return {
    numRowsToSkip: options.numRowsToSkip,
    delimiter: options.delimiter,
    quoteChar: options.quoteChar,
    escapeChar: options.escapeChar,
    newlineDelimiter: options.newlineDelimiter,
    commentChar: options.commentChar,
    hasHeader: options.hasHeader,
    dateFormat: options.dateFormat,
    timestampFormat: options.timestampFormat,
    columns: options.columns,
  };
}

async function _sniffCsvWithDuckDb(options: {
  runRawQuery: DuckDbClientImpl["runRawQuery"];
  conn: duckdb.AsyncDuckDBConnection;
  stagingFile: string;
  userHints: CsvParseUserHints;
  parseOptions: ReturnType<typeof createCsvParseOptionsFromUserHints>;
  /** When set, probes the file for `"` if sniff reports no quote char. */
  file?: File;
}): Promise<{
  parseOptions: ReturnType<typeof mergeSniffCsvRowIntoParseOptions>;
  sniffRow: DuckDbSniffCsvRow | undefined;
}> {
  const { runRawQuery, conn, stagingFile, userHints, parseOptions, file } =
    options;
  const sniffArgs = [
    ...buildSniffCsvConstraintArgs(parseOptions),
    `sample_size=${CSV_SNIFF_SAMPLE_SIZE}`,
  ].join(", ");

  const sniffResult = await runRawQuery<DuckDbSniffCsvRow>(
    `SELECT * FROM sniff_csv('$file$', ${sniffArgs})`,
    { conn, params: { file: stagingFile } },
  );
  const sniffRow = sniffResult.data[0];
  if (!sniffRow) {
    return { parseOptions, sniffRow: undefined };
  }

  let mergedParseOptions = mergeSniffCsvRowIntoParseOptions({
    base: parseOptions,
    sniffRow,
    userHints,
  });

  if (file) {
    mergedParseOptions = await applyQuoteProbeToParseOptions({
      file,
      sniffQuoteToken: sniffRow.Quote,
      parseOptions: mergedParseOptions,
    });
  }

  return {
    parseOptions: mergedParseOptions,
    sniffRow,
  };
}

function arrowTableToJS<RowObject extends UnknownRow>(
  arrowTable: arrow.Table<Record<string, arrow.DataType>>,
  { logger = Logger }: { logger?: ILogger } = {},
): QueryResult<RowObject> {
  const jsDataRows = arrowTable.toArray().map((row) => {
    const jsRow = row.toJSON();
    return objectValuesMap(jsRow, (v) => {
      if (typeof v === "bigint") {
        // beware that `v` might be bigger than Number.MAX_SAFE_INTEGER
        return Number(v);
      }

      if (v instanceof arrow.Vector) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return v.toArray().map((x: any) => {
          return x.toJSON();
        });
      }

      // Apache Arrow wraps DECIMAL / HUGEINT cells in DecimalBigNum objects
      // (4-limb Int128 representations). Recharts / ag-grid see these as plain
      // objects and can't compare, sort, or scale them, so unwrap to a JS
      // number here. Precision loss beyond 2^53 is acceptable for charts;
      // call sites that need exact decimal arithmetic should round-trip
      // through a string explicitly.
      if (v !== null && typeof v === "object") {
        const ctorName = (v as { constructor?: { name?: string } }).constructor
          ?.name;
        if (ctorName === "DecimalBigNum" || ctorName === "BigNum") {
          const primitive = (v as { valueOf: () => unknown }).valueOf();
          if (typeof primitive === "bigint") {
            return Number(primitive);
          }
          if (typeof primitive === "number") {
            return primitive;
          }
        }
      }

      return v;
    });
  });
  return {
    id: uuid(),
    columns: arrowTable.schema.fields.map((field) => {
      return arrowFieldToQueryResultField(field, { logger });
    }),
    data: jsDataRows,
    numRows: jsDataRows.length,
  };
}

/**
 * A DuckDB client.
 *
 * TODO(jpsyx): convert this to a composable function rather than a class.
 */
class DuckDbClientImpl {
  #db?: Promise<duckdb.AsyncDuckDB>;
  #wasmGeneration = 0;

  /**
   * Tracking open connections. This is useful for debugging if we ever need to
   * know if we forgot to close any connections.
   */
  #openConnections: Set<duckdb.AsyncDuckDBConnection> = new Set();
  #logger: ILogger = Logger.appendName("DuckDbClient");

  async #disposeDuckDbInstance(
    db: duckdb.AsyncDuckDB,
    worker: Worker,
  ): Promise<void> {
    worker.terminate();
    await db.terminate().catch(() => {});
  }

  async #assertInitStillCurrent(
    initGeneration: number,
    db: duckdb.AsyncDuckDB,
    worker: Worker,
  ): Promise<void> {
    if (initGeneration === this.#wasmGeneration) {
      return;
    }
    await this.#disposeDuckDbInstance(db, worker);
    throw new DuckDbWasmInitCancelled();
  }

  async #initialize(): Promise<duckdb.AsyncDuckDB> {
    const initGeneration = this.#wasmGeneration;
    const bundle = await duckdb.selectBundle(buildManualDuckDbBundles());

    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    try {
      await Promise.race([
        db.instantiate(bundle.mainModule, bundle.pthreadWorker),
        _waitForDuckDbWorkerFailure(worker),
      ]);
    } catch (error) {
      await this.#disposeDuckDbInstance(db, worker);
      throw error;
    }

    await this.#assertInitStillCurrent(initGeneration, db, worker);

    const conn = await db.connect();
    const loadNetworkExtensions = shouldLoadDuckDbNetworkExtensions({
      isDisableDuckDbSpatialFlagEnabled: isFlagEnabled(
        FeatureFlag.DisableDuckDbSpatial,
      ),
      hasPthreadWorker: bundle.pthreadWorker != null,
    });

    // Spatial / excel are fetched from `extensions.duckdb.org` on each fresh
    // AsyncDuckDB init (DuckDb-WASM does not persist extensions across page
    // loads). When offline, both fetches throw — we let init succeed without
    // them so the bulk of the app (parquet queries) still works. Geo or
    // .xlsx flows hit a runtime "unknown function/format" error instead of
    // breaking the whole client.
    // TODO(jpsyx): only load spatial when a geo query needs it.
    const loadOptionalExtension = async (name: string): Promise<void> => {
      try {
        await conn.query(`LOAD ${name};`);
      } catch (error) {
        this.#logger.warn(
          `DuckDB extension "${name}" failed to load (likely offline); ` +
            "queries that need it will fail.",
          { error },
        );
      }
    };
    if (loadNetworkExtensions) {
      await loadOptionalExtension("spatial");
    }
    await conn.query("LOAD parquet;");
    if (loadNetworkExtensions) {
      await loadOptionalExtension("excel");
    }
    await conn.close();

    await this.#assertInitStillCurrent(initGeneration, db, worker);
    return db;
  }

  async #getDB(): Promise<duckdb.AsyncDuckDB> {
    if (!this.#db) {
      this.#db = this.#initialize().catch((error: unknown) => {
        this.#db = undefined;
        throw error;
      });
    }
    return this.#db;
  }

  /**
   * Tears down the DuckDB-WASM worker so another large WASM runtime (e.g.
   * whisper.cpp) can allocate. The next query call re-initializes lazily.
   */
  async releaseWasmRuntime(): Promise<void> {
    this.#wasmGeneration += 1;
    const pendingInit = this.#db;
    this.#db = undefined;
    if (!pendingInit) {
      return;
    }
    try {
      const db = await pendingInit;
      const openConnections = [...this.#openConnections];
      await Promise.all(
        openConnections.map((connection) => {
          return this.#closeConnection(connection);
        }),
      );
      await db.terminate();
    } catch (error) {
      if (error instanceof DuckDbWasmInitCancelled) {
        return;
      }
      this.#logger.warn("DuckDB WASM release failed", { error });
    }
    this.#openConnections.clear();
  }

  async #connect(): Promise<duckdb.AsyncDuckDBConnection> {
    const db = await this.#getDB();
    const conn = await db.connect();
    this.#openConnections.add(conn);
    return conn;
  }

  async #closeConnection(conn: duckdb.AsyncDuckDBConnection): Promise<void> {
    this.#openConnections.delete(conn);
    await conn.close();
  }

  /**
   * Runs `callback` on a single DuckDB connection so temp views and tables
   * created in one statement remain visible to the next.
   */
  async withConnection<T>(
    callback: (conn: duckdb.AsyncDuckDBConnection) => Promise<T>,
  ): Promise<T> {
    const conn = await this.#connect();
    try {
      return await callback(conn);
    } finally {
      await this.#closeConnection(conn);
    }
  }

  async getTableNames(): Promise<string[]> {
    const conn = await this.#connect();
    // get all table names
    const result = await conn.query<{ table_name: arrow.DataType }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'main' AND table_type = 'BASE TABLE'
      `);
    const tableNames: string[] = result.toArray().map((row) => {
      return row.table_name;
    });
    await this.#closeConnection(conn);
    return tableNames;
  }

  /**
   * Gets the number of rows in a table.
   * @param tableName
   * @returns The number of rows.
   */
  async getTableRowCount(tableName: string): Promise<number> {
    const result = await this.runRawQuery<{ count: bigint }>(
      `SELECT count(*) as count FROM "$tableName$"`,
      { params: { tableName } },
    );
    return Number(result.data[0]?.count ?? 0);
  }

  /**
   * Gets the schema of a table
   * @param tableName The name of the table.
   * @returns The schema of the table as an array of
   * DuckDbColumnSchema objects.
   */
  async getTableSchema(tableName: string): Promise<DuckDbColumnSchema[]> {
    const { data } = await this.runRawQuery<DuckDbColumnSchema>(
      `DESCRIBE "$tableName$"`,
      { params: { tableName } },
    );
    return data;
  }

  async hasTable(tableName: string): Promise<boolean> {
    const dbTableNames = await this.getTableNames();
    return dbTableNames.includes(tableName);
  }

  async getViewNames(): Promise<string[]> {
    const conn = await this.#connect();
    const result = await conn.query<{ table_name: arrow.DataType }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'main' AND table_type = 'VIEW'
    `);
    const viewNames: string[] = result.toArray().map((row) => {
      return row.table_name;
    });
    await this.#closeConnection(conn);
    return viewNames;
  }

  async hasView(viewName: string): Promise<boolean> {
    const dbViewNames = await this.getViewNames();
    return dbViewNames.includes(viewName);
  }

  async getTableOrViewNames(): Promise<string[]> {
    const tableNames = await this.getTableNames();
    const viewNames = await this.getViewNames();
    return [...tableNames, ...viewNames];
  }

  async hasTableOrView(tableNameOrViewName: string): Promise<boolean> {
    const hasTable = await this.hasTable(tableNameOrViewName);
    if (hasTable) {
      return true;
    }
    const hasView = await this.hasView(tableNameOrViewName);
    return hasView;
  }

  /**
   * Registers a CSV file in DuckDB's internal file system.
   * @param options The options for registering the dataset.
   * @param options.tableName The name of the table to register the dataset
   * under. This must be a valid DuckDB table name. Calling `snakeify` on the
   * string before passing it to this function would be sufficient to ensure
   * the string is a valid table name.
   * @param options.file The file to register. This takes precedence over
   * passing `fileText`.
   * @param options.fileText The raw CSV text string to register. If a `file`
   * is provided, this option will be ignored.
   */
  async #registerCSVFile(
    options:
      | { tableName: string; file: File }
      | { tableName: string; fileText: string },
  ): Promise<void> {
    const { tableName } = options;
    const db = await this.#getDB();

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

  /**
   * Registers an `.xlsx` workbook in DuckDB's internal file system.
   *
   * @param options The options for registering the dataset.
   * @param options.tableName The name of the table to register the dataset
   * under. This must be a valid DuckDb table name.
   * @param options.file The file to register. This takes precedence over
   * passing `fileBytes`.
   * @param options.fileBytes The raw workbook bytes to register. If a `file`
   * is provided, this option will be ignored.
   * `_xlsxVirtualFileKey`).
   */
  async #registerXlsxFile(options: {
    tableName: string;
    file?: File;
    fileBytes?: Uint8Array<ArrayBuffer>;
  }): Promise<void> {
    const { tableName, file, fileBytes } = options;
    const db = await this.#getDB();
    // BROWSER_FILEREADER lets DuckDB do random-access reads against a Blob /
    // File via `slice(...).arrayBuffer()`, avoiding a redundant full-buffer
    // copy into DuckDB's WASM heap during ingest. XLSX still gets fully
    // materialized below via `CREATE TABLE AS read_xlsx(...)`, but peak
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
    throw new Error("#registerXlsxFile: expected file or fileBytes");
  }

  /**
   * Registers a Parquet file in DuckDB's internal file system.
   * @param options The options for registering the dataset.
   * @param options.tableName The name of the table to register the dataset
   * under. This must be a valid DuckDB table name.
   * @param options.blob The parquet file as a binary blob to register.
   */
  async #registerParquetFile(options: {
    tableName: string;
    blob: Blob;
  }): Promise<void> {
    const { tableName, blob } = options;
    if (blob.type !== MIMEType.APPLICATION_PARQUET) {
      throw new Error("Blob is not a parquet file");
    }
    const db = await this.#getDB();
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

  /**
   * Drops a file from DuckDB's internal file system and any tables related
   * to it. If the `tableName` does not exist, this will do nothing. It does
   * not throw an error.
   *
   * @param tableOrViewName The table or view name to drop. This will also be
   * used as the file name to drop.
   */
  async dropTableViewAndFile(tableOrViewName: string): Promise<void> {
    const db = await this.#getDB();

    const hasView = await this.hasView(tableOrViewName);
    if (hasView) {
      await this.runRawQuery('DROP VIEW "$tableName$"', {
        params: { tableName: tableOrViewName },
      });
    } else {
      const hasTable = await this.hasTable(tableOrViewName);
      if (hasTable) {
        await this.runRawQuery('DROP TABLE "$tableName$"', {
          params: { tableName: tableOrViewName },
        });
      }
    }

    // finally, drop the file from DuckDB's internal file system
    await db.dropFile(tableOrViewName);
  }

  /**
   * Loads a CSV file into DuckDB.
   * @param options The options for loading the CSV file.
   * @param options.tableName The name of the table to hold the raw data. This
   * also the file name that will be used in DuckDB's internal file system.
   * @param options.numRowsToSkip The number of rows to skip at the beginning
   * of the csv text. Defaults to `0`
   * @param options.delimiter The delimiter to use for the CSV file.
   * @param options.quoteChar The quote character to use for the CSV file.
   * @param options.escapeChar The escape character to use for the CSV file.
   * @param options.newlineDelimiter The newline delimiter to use for the CSV
   * file.
   * @param options.commentChar The comment character to use for the CSV file.
   * @param options.hasHeader Whether the CSV file has a header. Defaults to
   * `true`.
   * @param options.dateFormat The date format to use for the CSV file.
   * @param options.timestampFormat The timestamp format to use for the CSV
   * file.
   * @param options.columns The columns to use for the CSV file, if we know
   * the schema of the CSV file ahead of time and want to make sure these
   * columns get used. The record keys are the column names, the values are
   * the DuckDbDataType of the column.
   * @param options.file The file to load. This takes precedence over
   * passing `fileText`.
   * @param options.fileText The raw CSV text string to load. If a `file`
   * is provided, this option will be ignored.
   * @returns A promise that resolves when the file is loaded.
   */

  /**
   * Fast-path CSV inspection that returns the auto-detected dialect, the
   * inferred column schema, and the first N rows — without transcoding
   * the file to parquet. Used by Phase A of the async import flow so the
   * import form can render its preview within hundreds of milliseconds
   * regardless of the source CSV's size; Phase B (the full parquet
   * transcode via `loadCsv`) runs separately in the background.
   *
   * Bytes read on disk are bounded by DuckDB's CSV sniff sample (a few
   * scan-buffer chunks) plus the LIMIT N read for the preview, so this
   * stays cheap for multi-GB files when the source is registered via
   * `BROWSER_FILEREADER`.
   */
  async sniffCsv(options: {
    file: File;
    /** Hint passed to `read_csv`; mirrors `loadCsv`'s signature. */
    numRowsToSkip?: number;
    /** Hint passed to `read_csv`; mirrors `loadCsv`'s signature. */
    delimiter?: string;
    /** Hint passed to `read_csv`; mirrors `loadCsv`'s signature. */
    quoteChar?: string;
    /** Hint passed to `read_csv`; mirrors `loadCsv`'s signature. */
    escapeChar?: string;
    /** Hint passed to `read_csv`; mirrors `loadCsv`'s signature. */
    newlineDelimiter?: string;
    /** Hint passed to `read_csv`; mirrors `loadCsv`'s signature. */
    commentChar?: string;
    /** Hint passed to `read_csv`; mirrors `loadCsv`'s signature. */
    hasHeader?: boolean;
    /** Hint passed to `read_csv`; mirrors `loadCsv`'s signature. */
    dateFormat?: string;
    /** Hint passed to `read_csv`; mirrors `loadCsv`'s signature. */
    timestampFormat?: string;
    /** Number of preview rows to return (typically 200). */
    maxPreviewRows: number;
  }): Promise<{
    csvSniff: DuckDbCsvSniffResult;
    columns: DuckDbColumnSchema[];
    previewRows: UnknownRow[];
  }> {
    const userHints: CsvParseUserHints = {
      numRowsToSkip: options.numRowsToSkip,
      delimiter: options.delimiter,
      quoteChar: options.quoteChar,
      escapeChar: options.escapeChar,
      newlineDelimiter: options.newlineDelimiter,
      commentChar: options.commentChar,
      hasHeader: options.hasHeader,
      dateFormat: options.dateFormat,
      timestampFormat: options.timestampFormat,
    };

    const stagingFile = `sniff__${uuid()}.csv`;
    const conn = await this.#connect();
    try {
      await this.runRawQuery("DROP TABLE IF EXISTS reject_scans", { conn });
      await this.runRawQuery("DROP TABLE IF EXISTS reject_errors", { conn });

      await this.#registerCSVFile({
        tableName: stagingFile,
        file: options.file,
      });

      const baseParseOptions = createCsvParseOptionsFromUserHints(userHints);
      const { parseOptions, sniffRow } = await _sniffCsvWithDuckDb({
        runRawQuery: this.runRawQuery.bind(this),
        conn,
        stagingFile,
        userHints,
        parseOptions: baseParseOptions,
        file: options.file,
      });

      const readCsvArgs = buildReadCsvArgList({
        parseOptions,
        mode: "preview",
      }).join(", ");

      const describeResult = await this.runRawQuery<DuckDbColumnSchema>(
        `DESCRIBE SELECT * FROM read_csv('$file$', ${readCsvArgs})`,
        { conn, params: { file: stagingFile } },
      );

      const previewResult = await this.runRawQuery<UnknownRow>(
        `SELECT * FROM read_csv('$file$', ${readCsvArgs}) LIMIT ${options.maxPreviewRows}`,
        { conn, params: { file: stagingFile } },
      );

      const csvSniff =
        sniffRow ?
          buildDuckDbCsvSniffResultFromSniffRow({
            tableName: stagingFile,
            sniffRow,
            parseOptions,
          })
        : buildDuckDbCsvSniffResultFromResolved({
            tableName: stagingFile,
            parseOptions,
            columns: describeResult.data.map((col) => {
              return { name: col.column_name, type: col.column_type };
            }),
            userArguments: readCsvArgs,
          });

      const db = await this.#getDB();
      await db.dropFile(stagingFile);

      return {
        csvSniff,
        columns: describeResult.data,
        previewRows: previewResult.data,
      };
    } finally {
      await this.#closeConnection(conn);
    }
  }

  async loadCsv(options: DuckDbLoadCsvOptions): Promise<DuckDbLoadCsvResult> {
    const { tableName } = options;
    const userHints = _csvParseUserHintsFromLoadOptions(options);

    const csvStagingFile = `${tableName}__loadCsv_src`;
    const parquetStagingFile = `${tableName}__loadCsv_pq`;

    const conn = await this.#connect();
    let loadResults: DuckDbLoadCsvResult;
    try {
      await this.dropTableViewAndFile(tableName);

      await this.#registerCSVFile(
        "file" in options ?
          { tableName: csvStagingFile, file: options.file }
        : { tableName: csvStagingFile, fileText: options.fileText },
      );

      let parseOptions = createCsvParseOptionsFromUserHints(userHints);
      let rejectedScans: DuckDbScan[] = [];
      let rejectedRows: DuckDbRejectedRow[] = [];
      let lastSniffRow: DuckDbSniffCsvRow | undefined;

      Logger.log("columns specified", { columns: parseOptions.columns });

      for (let attempt = 0; attempt < MAX_CSV_PARSE_ATTEMPTS; attempt++) {
        await this.runRawQuery("DROP TABLE IF EXISTS reject_scans", { conn });
        await this.runRawQuery("DROP TABLE IF EXISTS reject_errors", { conn });

        const sniffed = await _sniffCsvWithDuckDb({
          runRawQuery: this.runRawQuery.bind(this),
          conn,
          stagingFile: csvStagingFile,
          userHints,
          parseOptions,
          file: "file" in options ? options.file : undefined,
        });
        parseOptions = sniffed.parseOptions;
        lastSniffRow = sniffed.sniffRow;

        const readCsvArgs = buildReadCsvArgList({
          parseOptions,
          mode: "load",
        }).join(", ");

        try {
          await this.runRawQuery(
            `COPY (
              SELECT *
              FROM read_csv('$csvFile$', ${readCsvArgs})
            ) TO '$pqFile$' (FORMAT PARQUET, COMPRESSION ZSTD)`,
            {
              conn,
              params: {
                csvFile: csvStagingFile,
                pqFile: parquetStagingFile,
              },
            },
          );
        } catch (error) {
          if (
            attempt < MAX_CSV_PARSE_ATTEMPTS - 1 &&
            isRecoverableCsvParseError(error)
          ) {
            if (parseOptions.quoteChar == null) {
              parseOptions = {
                ...parseOptions,
                quoteChar: DEFAULT_CSV_QUOTE_CHAR,
                escapeChar: parseOptions.escapeChar ?? DEFAULT_CSV_ESCAPE_CHAR,
              };
            }

            continue;
          }

          throw error;
        }

        const stagingRowCountResult = await this.runRawQuery<{ c: bigint }>(
          `SELECT count(*)::BIGINT as c FROM read_parquet('$pqFile$')`,
          { conn, params: { pqFile: parquetStagingFile } },
        );
        const stagingRowCount = Number(stagingRowCountResult.data[0]?.c ?? 0);
        const parseOptionsAfterEmptyStaging =
          resolveParseOptionsAfterEmptyStagingLoad({
            parseOptions,
            stagingRowCount,
          });

        if (
          parseOptionsAfterEmptyStaging &&
          attempt < MAX_CSV_PARSE_ATTEMPTS - 1
        ) {
          parseOptions = parseOptionsAfterEmptyStaging;
          const dbForRetry = await this.#getDB();
          await dbForRetry.dropFile(parquetStagingFile);
          continue;
        }

        const rejectedScansResult = await this.runRawQuery<DuckDbScan>(
          `SELECT * FROM reject_scans WHERE file_path='$csvFile$'`,
          { conn, params: { csvFile: csvStagingFile } },
        );
        rejectedScans = rejectedScansResult.data;
        rejectedRows = [];

        if (isNonEmptyArray(rejectedScans)) {
          const fileId = rejectedScans[0].file_id;
          const rejectedRowsResult = await this.runRawQuery<DuckDbRejectedRow>(
            `SELECT * FROM reject_errors WHERE file_id='$fileId$'`,
            { conn, params: { fileId } },
          );
          rejectedRows = rejectedRowsResult.data;
        }

        const refinedOptions = refineCsvParseOptionsAfterFailure({
          parseOptions,
          rejectedRows,
        });

        if (
          shouldRetryCsvParse({
            attemptIndex: attempt,
            maxAttempts: MAX_CSV_PARSE_ATTEMPTS,
            rejectedRows,
            parseOptions,
            refinedOptions,
          })
        ) {
          parseOptions = refinedOptions;
          continue;
        }

        break;
      }

      const db = await this.#getDB();
      const parquetBuffer = (await db.copyFileToBuffer(
        parquetStagingFile,
      )) as Uint8Array<ArrayBuffer>;
      const parquetData = new Blob([parquetBuffer], {
        type: MIMEType.APPLICATION_PARQUET,
      });
      await db.dropFile(csvStagingFile);
      await db.dropFile(parquetStagingFile);

      await this.loadParquet({ tableName, blob: parquetData });

      const tableColumns = await this.getTableSchema(tableName);
      Logger.log("tableColumns", { tableColumns });
      const csvRowCount = await this.getTableRowCount(tableName);
      if (csvRowCount === 0) {
        throw new Error(
          "CSV load produced zero rows. The file may use quotes or column types that differ from the sniff sample.",
        );
      }
      const csvErrors = {
        rejectedScans,
        rejectedRows,
      };

      const scan = rejectedScans[0];
      const csvSniffResult =
        scan ?
          buildDuckDbCsvSniffResultFromRejectScan({
            tableName,
            scan,
            commentChar: parseOptions.commentChar,
          })
        : lastSniffRow ?
          buildDuckDbCsvSniffResultFromSniffRow({
            tableName,
            sniffRow: lastSniffRow,
            parseOptions,
          })
        : buildDuckDbCsvSniffResultFromResolved({
            tableName,
            parseOptions,
            columns: tableColumns.map((col) => {
              return { name: col.column_name, type: col.column_type };
            }),
            userArguments: buildReadCsvArgList({
              parseOptions,
              mode: "load",
            }).join(", "),
          });

      this.#logger.log("Successfully transcoded CSV into parquet!");

      loadResults = {
        id: uuid(),
        type: "csv",
        tableName,
        csvName: tableName,
        numRows: csvRowCount,
        columns: tableColumns,
        errors: csvErrors,
        numRejectedRows: csvErrors.rejectedRows.length,
        csvSniff: csvSniffResult,
        parquetData,
      };
    } finally {
      await this.#closeConnection(conn);
    }

    return loadResults;
  }

  /**
   * Loads an `.xlsx` workbook into DuckDB using `read_xlsx`.
   *
   * Legacy `.xls` (BIFF) files are rejected; DuckDB only supports `.xlsx`.
   *
   * @param options.tableName Table and base name for the virtual `.xlsx` file.
   * @param options.sheet Optional worksheet name (first sheet if omitted).
   * @param options.hasHeader First row is column names (`read_xlsx` `header`).
   * @param options.file Browser file to load (takes precedence over bytes).
   * @param options.fileBytes Raw `.xlsx` bytes when no `File` is available.
   */
  async loadXlsx(
    options: DuckDbLoadXlsxOptions,
  ): Promise<DuckDbLoadXlsxResult> {
    const { tableName, sheet } = options;
    const hasHeader = options.hasHeader ?? true;

    // Stage the XLSX under a distinct MEMFS name so the final VIEW can take
    // `tableName`. The transcoded parquet lives under a temp name only as
    // long as it takes to copy the bytes out into a JS Blob and re-register
    // it via the parquet path.
    const xlsxStagingFile = `${tableName}__loadXlsx_src`;
    const parquetStagingFile = `${tableName}__loadXlsx_pq`;

    const conn = await this.#connect();
    let loadResults: DuckDbLoadXlsxResult;

    try {
      await this.dropTableViewAndFile(tableName);
      if ("file" in options) {
        _assertXlsxFileReadable(options.file);
        await this.#registerXlsxFile({
          tableName: xlsxStagingFile,
          file: options.file,
        });
      } else {
        await this.#registerXlsxFile({
          tableName: xlsxStagingFile,
          fileBytes: options.fileBytes,
        });
      }

      // Stream the sheet directly to a parquet file in MEMFS. Same idea as
      // `loadCsv`: no DuckDB TABLE is materialized; rows flow read_xlsx →
      // row-group encoder → parquet writer. XLSX itself is less
      // stream-friendly than CSV (the format requires a full sheet-XML
      // parse), but we still avoid keeping the resulting table resident in
      // the WASM heap, and the output parquet replaces the workbook as
      // the source of truth for every subsequent query.
      await this.runRawQuery(
        `COPY (
          SELECT * FROM read_xlsx(
            '$xlsxFile$'
            , header = ${hasHeader}
            ${sheet ? `, sheet = '${_escapeSqlSingleQuotedLiteral(sheet)}'` : ""}
          )
        ) TO '$pqFile$' (FORMAT PARQUET, COMPRESSION ZSTD)`,
        {
          conn,
          params: {
            xlsxFile: xlsxStagingFile,
            pqFile: parquetStagingFile,
          },
        },
      );

      // Pull the parquet bytes out of MEMFS into a JS Blob, then drop the
      // MEMFS-side files so the WASM heap reclaims them.
      const db = await this.#getDB();
      const parquetBuffer = (await db.copyFileToBuffer(
        parquetStagingFile,
      )) as Uint8Array<ArrayBuffer>;
      const parquetData = new Blob([parquetBuffer], {
        type: MIMEType.APPLICATION_PARQUET,
      });
      await db.dropFile(xlsxStagingFile);
      await db.dropFile(parquetStagingFile);

      // Re-load from the freshly produced parquet. Creates a VIEW named
      // `tableName` on top of the parquet bytes; future queries go through
      // the columnar read path with projection / LIMIT pushdown.
      await this.loadParquet({ tableName, blob: parquetData });

      this.#logger.log("Successfully transcoded XLSX into parquet!");

      const tableColumns = await this.getTableSchema(tableName);
      const rowCount = await this.getTableRowCount(tableName);

      loadResults = {
        id: uuid(),
        type: "xlsx",
        tableName,
        xlsxName: tableName,
        numRows: rowCount,
        columns: tableColumns,
        sheet,
        parquetData,
      };
    } finally {
      await this.#closeConnection(conn);
    }

    return loadResults;
  }

  /**
   * Loads a parquet file into DuckDB.
   * @param options The options for loading the parquet file.
   * @param options.tableName The name of the table to hold the raw data. This
   * also the file name that will be used in DuckDB's internal file system.
   * @param options.blob The parquet file to load.
   * @returns A promise that resolves when the file is loaded.
   */
  async loadParquet(options: {
    tableName: string;
    blob: Blob;
    columnReplacements?: Record<
      string,
      {
        alias?: string;
        dataType?: DuckDbDataType;
      }
    >;
  }): Promise<DuckDbLoadParquetResult> {
    const { tableName, blob, columnReplacements } = options;
    let loadResults: DuckDbLoadParquetResult;

    // Drop the dataset and recreate it. We are overwriting the data.
    await this.dropTableViewAndFile(tableName);
    await this.#registerParquetFile({ tableName, blob });

    const conn = await this.#connect();
    try {
      const exclusions: string[] = [];
      const replacements: string[] = [];

      objectEntries(columnReplacements ?? {}).forEach(
        ([colName, { alias, dataType }]) => {
          const newColumnName = alias ?? colName;
          const castPart =
            dataType ? `TRY_CAST("${colName}" AS ${dataType})` : `"${colName}"`;
          const newNamePart = ` AS "${newColumnName}"`;
          replacements.push(`${castPart}${newNamePart}`);
          exclusions.push(`"${colName}"`);
        },
      );

      // Re-ingest the parquet data into a view (low-memory querying).
      await this.runRawQuery(
        `SET enable_external_file_cache = false;
CREATE VIEW IF NOT EXISTS "$tableName$" AS
    SELECT * $excludeClause$ $replaceClause$
    FROM read_parquet("$tableName$");
SET enable_external_file_cache = true;
            `,
        {
          conn,
          params: {
            tableName,
            replaceClause:
              replacements.length > 0 ? `, ${replacements.join(", ")}` : "",
            excludeClause:
              exclusions.length > 0 ? `EXCLUDE (${exclusions.join(", ")})` : "",
          },
        },
      );

      // now let's collect all information we need to return
      const columns = await this.getTableSchema(tableName);
      const rowCount = await this.getTableRowCount(tableName);
      loadResults = {
        name: tableName,
        columns,
        id: uuid(),
        numRows: rowCount,
      };
    } finally {
      await this.#closeConnection(conn);
    }
    return loadResults;
  }

  /**
   * Exports a table or view as a Parquet file using ZSTD compression (default).
   *
   * "Exporting" means that we turn it into a blob (a binary object).
   *
   * @param tableOrViewName The name of the table or view to export as a Parquet
   * blob.
   */
  async exportTableAsParquet(
    tableOrViewName: string,
    conn?: duckdb.AsyncDuckDBConnection,
  ): Promise<Blob> {
    try {
      const db = await this.#getDB();
      const tempParquetFileName = `${tableOrViewName}.temp`;
      await this.runRawQuery(
        `COPY '$tableName$' TO '$parquetFileName$' (
          FORMAT 'parquet',
          COMPRESSION 'ZSTD'
        )`,
        {
          conn,
          params: {
            tableName: tableOrViewName,
            parquetFileName: tempParquetFileName,
          },
        },
      );

      const parquetBuffer = (await db.copyFileToBuffer(
        tempParquetFileName,
      )) as Uint8Array<ArrayBuffer>;

      const parquetBlob = new Blob([parquetBuffer], {
        type: MIMEType.APPLICATION_PARQUET,
      });

      await db.dropFile(tempParquetFileName);
      return parquetBlob;
    } catch (error) {
      // drop the view so it's not left behind
      await conn?.query(`DROP VIEW IF EXISTS "${tableOrViewName}"`);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.#logger.error(error, {
        msg: "Failed to export table as parquet (ZSTD)",
        errMsg: errorMessage,
      });
      throw new Error(`Parquet export failed: ${errorMessage}`);
    }
  }

  /**
   * Runs a query against the database.
   *
   * The query can be parametrized by using `$paramName$` syntax. All strings
   * following that syntax will be replaced by their tokens of the same name
   * in the `params` object.
   *
   * For example:
   *
   * ```ts
   * await client.runRawQuery(
   *   'SELECT "$columnName$" FROM "$tableName$"',
   *   { tableName, columnName }
   * );
   * ```
   *
   * (The quotation marks in the SELECT statement have nothing to do with
   * the parametrization. This is SQL syntax to enforce case-sensitivity.
   * Usually you will want to use these when passing table or column names
   * to ensure they are treated as case-sensitive identifiers.)
   *
   * @param queryString The query to run.
   * @param options Additional options for the query
   * @param options.params The parameters to replace in the query string.
   * Undefined values will be ignored.
   * @param options.conn The connection to use for the query. If not
   * provided, a new connection will be created. This is useful when previous
   * operations have created temporary data (e.g. transient tables) that will
   * not exist in a new connection. This gives you a way to continue querying
   * on a given connection.
   * @returns The results of the query.
   */
  async runRawQuery<RowObject extends UnknownRow = UnknownRow>(
    queryString: string,
    options?: {
      params?: Record<string, string | number | bigint | undefined>;
      returnType?: "js";
      conn?: duckdb.AsyncDuckDBConnection;
    },
  ): Promise<QueryResult<RowObject>>;
  async runRawQuery(
    queryString: string,
    options?: {
      params?: Record<string, string | number | bigint | undefined>;
      returnType: "parquet";
      conn?: duckdb.AsyncDuckDBConnection;
    },
  ): Promise<Blob>;
  async runRawQuery<RowObject extends UnknownRow = UnknownRow>(
    queryString: string,
    options: {
      params?: Record<string, string | number | bigint | undefined>;
      returnType?: "parquet" | "js";
      conn?: duckdb.AsyncDuckDBConnection;
    } = {},
  ): Promise<Blob | QueryResult<RowObject>> {
    const { params = {}, returnType = "js" } = options;
    const conn = options.conn ?? (await this.#connect());
    let queryResults: QueryResult<RowObject> | Blob;
    const paramNames = objectKeys(params);
    const queryStringToUse = paramNames.reduce((currQueryStr, paramName) => {
      const argValue = params[paramName];
      if (argValue === undefined) {
        return currQueryStr;
      }
      return currQueryStr.replace(
        new RegExp(`\\$${paramName}\\$`, "g"),
        String(argValue),
      );
    }, queryString);

    try {
      this.#logger.log("Executing query", { query: queryStringToUse });
      // run the query
      if (returnType === "js") {
        const arrowTable =
          await conn.query<Record<string, arrow.DataType>>(queryStringToUse);
        queryResults = arrowTableToJS<RowObject>(arrowTable, {
          logger: this.#logger,
        });
      } else {
        // return as parquet blob
        const tempViewName = uuid();
        await conn.query(
          `CREATE TEMP VIEW "${tempViewName}" AS ${queryStringToUse}`,
        );
        queryResults = await this.exportTableAsParquet(tempViewName, conn);
      }
    } catch (error) {
      this.#logger.error(error, {
        executedQueryString: queryStringToUse,
        templatedQueryString: queryString,
      });
      throw error;
    } finally {
      // If we created the connection in this function, then we can close it.
      // Otherwise, if a connection was passed to us, we should do nothing. It
      // should be up to the caller to close the connection.
      if (conn !== options.conn) {
        await this.#closeConnection(conn);
      }
    }

    return queryResults;
  }

  async #getPageHelper<T extends UnknownRow>(
    queryParams: Omit<
      DuckDbStructuredQuery & {
        pageSize: number;
        pageNum: number;
        totalRows: number | undefined;
      },
      "limit" | "offset"
    >,
  ): Promise<QueryResultPage<T>> {
    const { tableName, pageSize, pageNum, totalRows } = queryParams;
    const pageData = await this.runStructuredQuery<T>({
      ...queryParams,
      limit: pageSize,
      offset: pageSize * pageNum,
    });

    // Now let's get the page metadata to add to the return result
    let totalRowsInSource = totalRows;
    if (totalRowsInSource === undefined) {
      if (pageNum === 0 && pageData.data.length < pageSize) {
        // if we're on the first page and the number of rows we received
        // is less than the requested `pageSize`, then we can be 100% sure
        // that we have all the rows. So there's no need to send a separate
        // `getTableRowCount` query
        totalRowsInSource = pageData.numRows;
      } else {
        // TODO(jpsyx): this should reuse the query params, in case a filter
        // got sent
        totalRowsInSource = await this.getTableRowCount(tableName);
      }
    }

    // special case for when there's 0 rows, we still say there is 1 page
    const totalPages =
      totalRowsInSource === 0 ? 1 : Math.ceil(totalRowsInSource / pageSize);
    const nextPage = pageNum + 1 === totalPages ? undefined : pageNum + 1;
    const prevPage = pageNum === 0 ? undefined : pageNum - 1;

    return {
      ...pageData,
      totalRows: totalRowsInSource,
      totalPages,
      nextPage,
      prevPage,
      pageNum,
    };
  }

  async getPage<T extends UnknownRow>({
    selectColumnNames: selectColumns = "*",
    groupByColumnNames: groupByColumns = [],
    pageSize = 500,
    pageNum = 0,
    ...restOfStructuredQuery
  }: Omit<
    DuckDbStructuredQuery & { pageSize: number; pageNum: number },
    "limit" | "offset"
  >): Promise<QueryResultPage<T>> {
    const page = await this.#getPageHelper<T>({
      selectColumnNames: selectColumns,
      groupByColumnNames: groupByColumns,
      pageSize,
      pageNum,
      // pass `undefined` to mean we don't know the total number of rows
      // yet. We don't want to calculate this eagerly because there are cases
      // where we won't need to send a separate `count` query.
      totalRows: undefined,
      ...restOfStructuredQuery,
    });
    return page;
  }

  async forEachQueryPage<T extends UnknownRow>(
    {
      selectColumnNames = "*",
      groupByColumnNames = [],
      aggregations = {},
      pageSize = 1000,
      ...restOfStructuredQuery
    }: Omit<DuckDbStructuredQuery, "limit" | "offset"> & {
      pageSize?: number;
    },
    callback: (page: QueryResultPage<T>) => void | Promise<void>,
  ): Promise<{ numPages: number; numRows: number }> {
    const firstPage = await this.#getPageHelper<T>({
      selectColumnNames,
      groupByColumnNames,
      aggregations,
      pageSize,
      pageNum: 0,
      // pass `undefined` to mean we don't know the total number of rows
      // yet. We don't want to calculate this eagerly because there are cases
      // where we won't need to send a separate `count` query.
      totalRows: undefined,
      ...restOfStructuredQuery,
    });
    await callback(firstPage);

    let numPages = 1;
    let numRows = firstPage.numRows;

    // Now iterate through pages until we get the last one
    let nextPageNum = firstPage.nextPage;
    while (nextPageNum !== undefined) {
      const newPage = await this.#getPageHelper<T>({
        selectColumnNames,
        groupByColumnNames,
        aggregations,
        pageSize,
        pageNum: nextPageNum,
        totalRows: firstPage.totalRows,
        ...restOfStructuredQuery,
      });
      await callback(newPage);
      nextPageNum = newPage.nextPage;
      numPages += 1;
      numRows += newPage.numRows;
    }
    return { numPages, numRows };
  }

  async runStructuredQuery<RowObject extends UnknownRow>({
    tableName,
    selectColumnNames = "*",
    groupByColumnNames = [],
    aggregations = {},
    orderByColumnName,
    orderByDirection,
    castTimestampsToISO,
    limit,
    offset,
  }: DuckDbStructuredQuery): Promise<QueryResult<RowObject>> {
    const conn = await this.#connect();
    let queryResults: QueryResult<RowObject>;
    const tableColumns = await this.getTableSchema(tableName);
    const timestampColumnNames = tableColumns
      .filter((col) => {
        return DuckDbDataTypeUtils.isDateOrTimestamp(col.column_type);
      })
      .map(prop("column_name"));

    const columnNames =
      selectColumnNames === "*" ?
        tableColumns.map(prop("column_name"))
      : selectColumnNames;

    const columnNamesWithoutAggregations = columnNames.filter((colName) => {
      return aggregations[colName] === undefined;
    });

    // if requested, cast any timestamp columns that will go in the SELECT
    // clause to ISO strings
    const adjustedFieldNames =
      castTimestampsToISO ?
        columnNamesWithoutAggregations.map((colName) => {
          const quotedColName = _quoteSQLIdentifier(colName);
          return timestampColumnNames.includes(colName) ?
              sql.raw(
                `strftime(${quotedColName}::TIMESTAMP, ` +
                  "'%Y-%m-%dT%H:%M:%S.%fZ') as " +
                  quotedColName,
              )
            : sql.raw(quotedColName);
        })
      : columnNamesWithoutAggregations.map((colName) => {
          return sql.raw(_quoteSQLIdentifier(colName));
        });

    let query = sql.select(...adjustedFieldNames).from(tableName);
    if (groupByColumnNames.length > 0) {
      const groupByClause = groupByColumnNames
        .map((colName) => {
          return _quoteSQLIdentifier(colName);
        })
        .join(", ");
      query = query.groupByRaw(groupByClause);
    }

    if (orderByColumnName && orderByDirection) {
      const quotedOrderByColumn = _quoteSQLIdentifier(orderByColumnName);
      query = query.orderByRaw(`${quotedOrderByColumn} ${orderByDirection}`);
    }

    // apply aggregations
    query = objectEntries(aggregations).reduce(
      (newQuery, [columnName, aggType]) => {
        const aggregationColumnName =
          DuckDBQueryAggregations.getAggregationColumnName(aggType, columnName);
        const quotedColumnName = _quoteSQLIdentifier(columnName);
        const quotedAggregationColumnName = _quoteSQLIdentifier(
          aggregationColumnName,
        );

        return match(aggType)
          .with("sum", () => {
            return newQuery.select(
              sql.raw(
                `sum(${quotedColumnName}) as ${quotedAggregationColumnName}`,
              ),
            );
          })
          .with("avg", () => {
            return newQuery.select(
              sql.raw(
                `avg(${quotedColumnName}) as ${quotedAggregationColumnName}`,
              ),
            );
          })
          .with("count", () => {
            return newQuery.select(
              sql.raw(
                `count(${quotedColumnName}) as ${quotedAggregationColumnName}`,
              ),
            );
          })
          .with("max", () => {
            return newQuery.select(
              sql.raw(
                `max(${quotedColumnName}) as ${quotedAggregationColumnName}`,
              ),
            );
          })
          .with("min", () => {
            return newQuery.select(
              sql.raw(
                `min(${quotedColumnName}) as ${quotedAggregationColumnName}`,
              ),
            );
          })
          .exhaustive(() => {
            throw new Error(`Invalid DuckDBQueryAggregationType: "${aggType}"`);
          });
      },
      query,
    );

    // apply limits and offsets
    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.offset(offset);
    }

    // run the query
    try {
      const queryString = query.toString();
      const arrowTable =
        await conn.query<Record<string, arrow.DataType>>(queryString);

      queryResults = arrowTableToJS<RowObject>(arrowTable, {
        logger: this.#logger,
      });
    } catch (error) {
      this.#logger.error(error, { query: query.toString() });
      throw error;
    } finally {
      await this.#closeConnection(conn);
    }

    return queryResults;
  }
}

export const DuckDbClient = new DuckDbClientImpl();
