import { ILogger } from "@avandar/logger";
import {
  isNonEmptyArray,
  MIMEType,
  objectEntries,
  objectKeys,
  objectValuesMap,
  prop,
} from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import * as duckdb from "@duckdb/duckdb-wasm";
import { uuid } from "$/lib/uuid";
import { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import { DuckDbQueryAggregations } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import * as arrow from "apache-arrow";
import knex from "knex";
import { match } from "ts-pattern";
import {
  CSV_SNIFF_SAMPLE_SIZE,
  DEFAULT_CSV_ESCAPE_CHAR,
  DEFAULT_CSV_QUOTE_CHAR,
  MAX_CSV_PARSE_ATTEMPTS,
} from "@/clients/DuckDbClient/csvParse/csvParse.constants";
import { isRecoverableCsvParseError } from "@/clients/DuckDbClient/csvParse/csvParseError";
import {
  createCsvParseOptionsFromUserHints,
  mergeSniffCsvRowIntoParseOptions,
  refineCsvParseOptionsAfterFailure,
  resolveParseOptionsAfterEmptyStagingLoad,
  shouldRetryCsvParse,
} from "@/clients/DuckDbClient/csvParse/csvParseOptions";
import { applyQuoteProbeToParseOptions } from "@/clients/DuckDbClient/csvParse/csvQuoteProbe";
import {
  buildReadCsvArgList,
  buildSniffCsvConstraintArgs,
} from "@/clients/DuckDbClient/csvParse/csvReadCsvArgs";
import {
  buildDuckDbCsvSniffResultFromRejectScan,
  buildDuckDbCsvSniffResultFromResolved,
  buildDuckDbCsvSniffResultFromSniffRow,
} from "@/clients/DuckDbClient/csvParse/duckDbCsvSniffResult";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
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
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import { Logger } from "@/utils/Logger";
import { arrowFieldToQueryResultField } from "./arrowFieldToQueryResultField";
import type {
  CsvParseResolvedOptions,
  CsvParseUserHints,
  DuckDbSniffCsvRow,
} from "@/clients/DuckDbClient/csvParse/csvParse.types";
import type {
  DatasetDuckDbLease,
  PublicSnapshotDuckDbOwner,
} from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Knex } from "knex";

const sql = knex({
  client: "sqlite3",
  wrapIdentifier: (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  },
  useNullAsDefault: true,
});
const TRUSTED_INTERNAL_SQL: unique symbol = Symbol("TRUSTED_INTERNAL_SQL");

type CreateParquetViewOptions = {
  conn: duckdb.AsyncDuckDBConnection;
  datasetDuckDbLease: DatasetDuckDbLease;
  excludeClause: string;
  replaceClause: string;
  tableName: string;
};

type TranscodeXlsxOptions = {
  conn: duckdb.AsyncDuckDBConnection;
  datasetDuckDbLease: DatasetDuckDbLease;
  hasHeader: boolean;
  parquetStagingFile: string;
  sheet: string | undefined;
  xlsxStagingFile: string;
};

type XlsxLoadResultOptions = {
  datasetDuckDbLease: DatasetDuckDbLease;
  parquetData: Blob;
  sheet: string | undefined;
  tableName: string;
};

type CsvParseAttemptState = {
  lastSniffRow: DuckDbSniffCsvRow | undefined;
  parseOptions: CsvParseResolvedOptions;
  rejectedRows: DuckDbRejectedRow[];
  rejectedScans: DuckDbScan[];
};

type WriteCsvAttemptOptions = {
  attemptIndex: number;
  conn: duckdb.AsyncDuckDBConnection;
  csvStagingFile: string;
  file: File | undefined;
  parquetStagingFile: string;
  parseOptions: CsvParseResolvedOptions;
  userHints: CsvParseUserHints;
};

type CsvLoadResultOptions = CsvParseAttemptState & {
  datasetDuckDbLease: DatasetDuckDbLease;
  parquetData: Blob;
  tableName: string;
};

type CsvPreviewOptions = {
  conn: duckdb.AsyncDuckDBConnection;
  stagingFile: string;
  parseOptions: CsvParseResolvedOptions;
  maxPreviewRows: number;
};

type CsvPreviewSniffOptions = {
  stagingFile: string;
  sniffRow: DuckDbSniffCsvRow | undefined;
  parseOptions: CsvParseResolvedOptions;
  preview: CsvPreviewData;
};

type CopyCsvAttemptOptions = {
  conn: duckdb.AsyncDuckDBConnection;
  csvStagingFile: string;
  parquetStagingFile: string;
  parseOptions: CsvParseResolvedOptions;
};

type RunCsvParseAttemptsOptions = Omit<
  WriteCsvAttemptOptions,
  "attemptIndex" | "parseOptions"
>;

type EvaluateCsvParseAttemptOptions = Omit<
  RunCsvParseAttemptsOptions,
  "file" | "userHints"
> & {
  attemptIndex: number;
  state: CsvParseAttemptState;
};

type PageTotalRowsOptions = {
  tableName: string;
  pageSize: number;
  pageNum: number;
  totalRows: number | undefined;
  pageData: QueryResult.T<UnknownRow>;
};

type RemainingQueryPagesOptions<T extends UnknownRow> = {
  callback: (page: QueryResult.Page<T>) => void | Promise<void>;
  firstPage: QueryResult.Page<T>;
  query: Omit<DuckDbStructuredQuery, "limit" | "offset"> & {
    pageSize: number;
    selectColumnNames: DuckDbStructuredQuery["selectColumnNames"];
    groupByColumnNames: DuckDbStructuredQuery["groupByColumnNames"];
    aggregations: DuckDbStructuredQuery["aggregations"];
  };
};

type RawQueryOptions = {
  params?: Record<string, string | number | bigint | undefined>;
  returnType?: "parquet" | "js";
  conn?: duckdb.AsyncDuckDBConnection;
  datasetDuckDbLease?: DatasetDuckDbLease;
  datasetTableReadMode?: "public" | "workspace";
  publicSnapshotDuckDbOwner?: PublicSnapshotDuckDbOwner;
  [TRUSTED_INTERNAL_SQL]?: true;
};

type RawQueryExecutionPlan = {
  datasetIds: string[];
  mutatedDatasetIds: string[];
  publicSnapshotDuckDbOwner: PublicSnapshotDuckDbOwner | undefined;
  readDatasetIds: string[];
};

type SniffCsvOptions = {
  file: File;
  numRowsToSkip?: number;
  delimiter?: string;
  quoteChar?: string;
  escapeChar?: string;
  newlineDelimiter?: string;
  commentChar?: string;
  hasHeader?: boolean;
  dateFormat?: string;
  timestampFormat?: string;
  maxPreviewRows: number;
};

type CsvPreviewData = {
  columns: DuckDbColumnSchema[];
  previewRows: UnknownRow[];
  readCsvArgs: string;
};

type CsvPreviewResultOptions = {
  parseOptions: CsvParseResolvedOptions;
  preview: CsvPreviewData;
  sniffRow: DuckDbSniffCsvRow | undefined;
  stagingFile: string;
};

function _getCsvParseUserHintsFromSniffOptions(
  options: Readonly<SniffCsvOptions>,
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
  };
}

function _escapeSqlSingleQuotedLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

function _getParquetProjectionClauses(
  columnReplacements: DuckDbLoadParquetOptions["columnReplacements"],
): { excludeClause: string; replaceClause: string } {
  const projections = objectEntries(columnReplacements ?? {}).map(
    ([columnName, { alias, dataType }]) => {
      const outputName = alias ?? columnName;
      const valueExpression =
        dataType ?
          `TRY_CAST("${columnName}" AS ${dataType})`
        : `"${columnName}"`;
      return {
        exclusion: `"${columnName}"`,
        replacement: `${valueExpression} AS "${outputName}"`,
      };
    },
  );
  return {
    excludeClause:
      projections.length > 0 ?
        `EXCLUDE (${projections.map(prop("exclusion")).join(", ")})`
      : "",
    replaceClause:
      projections.length > 0 ?
        `, ${projections.map(prop("replacement")).join(", ")}`
      : "",
  };
}

function _getAggregationSelectExpression(
  options: Readonly<{
    aggregationType: QueryAggregationType.DuckDbQueryAggregationType;
    columnName: string;
  }>,
): Knex.Raw {
  const aggregationColumnName =
    DuckDbQueryAggregations.getAggregationColumnName(
      options.aggregationType,
      options.columnName,
    );
  const quotedColumnName = quoteSqlIdentifier(options.columnName);
  const quotedAggregationColumnName = quoteSqlIdentifier(aggregationColumnName);
  const functionName = match(options.aggregationType)
    .with("sum", () => {
      return "sum";
    })
    .with("avg", () => {
      return "avg";
    })
    .with("count", () => {
      return "count";
    })
    .with("max", () => {
      return "max";
    })
    .with("min", () => {
      return "min";
    })
    .exhaustive();
  return sql.raw(
    `${functionName}(${quotedColumnName}) as ${quotedAggregationColumnName}`,
  );
}

function _mergeDuckDbDatasetIds(
  ...datasetIdGroups: readonly string[][]
): string[] {
  return Array.from(new Set(datasetIdGroups.flat()));
}

function _getQueryStringFromParams(
  options: Readonly<{
    params: Record<string, string | number | bigint | undefined>;
    queryString: string;
  }>,
): string {
  return objectKeys(options.params).reduce((currentQuery, parameterName) => {
    const argumentValue = options.params[parameterName];
    if (argumentValue === undefined) {
      return currentQuery;
    }
    return currentQuery.replace(
      new RegExp(`\\$${parameterName}\\$`, "g"),
      String(argumentValue),
    );
  }, options.queryString);
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
  datasetDuckDbLease?: DatasetDuckDbLease;
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
  datasetDuckDbLease?: DatasetDuckDbLease;
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

type DuckDbLoadParquetOptions = {
  tableName: string;
  blob: Blob;
  columnReplacements?: Record<
    string,
    {
      alias?: string;
      dataType?: DuckDbDataType;
    }
  >;
  datasetDuckDbLease?: DatasetDuckDbLease;
};

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

function _getCsvSniffResult(
  options: Readonly<
    CsvParseAttemptState & {
      tableColumns: DuckDbColumnSchema[];
      tableName: string;
    }
  >,
): DuckDbCsvSniffResult {
  const { lastSniffRow, parseOptions, rejectedScans, tableColumns, tableName } =
    options;
  const scan = rejectedScans[0];
  if (scan) {
    return buildDuckDbCsvSniffResultFromRejectScan({
      tableName,
      scan,
      commentChar: parseOptions.commentChar,
    });
  }
  if (lastSniffRow) {
    return buildDuckDbCsvSniffResultFromSniffRow({
      tableName,
      sniffRow: lastSniffRow,
      parseOptions,
    });
  }
  return buildDuckDbCsvSniffResultFromResolved({
    tableName,
    parseOptions,
    columns: tableColumns.map((column) => {
      return { name: column.column_name, type: column.column_type };
    }),
    userArguments: buildReadCsvArgList({ parseOptions, mode: "load" }).join(
      ", ",
    ),
  });
}

type SniffCsvWithDuckDbOptions = {
  runRawQuery: DuckDbClientImpl["runRawQuery"];
  conn: duckdb.AsyncDuckDBConnection;
  stagingFile: string;
  userHints: CsvParseUserHints;
  parseOptions: ReturnType<typeof createCsvParseOptionsFromUserHints>;
  /** When set, probes the file for `"` if sniff reports no quote char. */
  file?: File;
};

async function _sniffCsvWithDuckDb(
  options: Readonly<SniffCsvWithDuckDbOptions>,
): Promise<{
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
    {
      conn,
      params: { file: stagingFile },
      [TRUSTED_INTERNAL_SQL]: true,
    },
  );
  const sniffRow = sniffResult.data[0];
  if (!sniffRow) {
    return { parseOptions, sniffRow: undefined };
  }

  const mergedParseOptions = mergeSniffCsvRowIntoParseOptions({
    base: parseOptions,
    sniffRow,
    userHints,
  });
  return {
    parseOptions:
      file ?
        await applyQuoteProbeToParseOptions({
          file,
          sniffQuoteToken: sniffRow.Quote,
          parseOptions: mergedParseOptions,
        })
      : mergedParseOptions,
    sniffRow,
  };
}

function _toJsValueFromArrowValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value instanceof arrow.Vector) {
    return value.toArray().map((item: Readonly<{ toJSON: () => unknown }>) => {
      return item.toJSON();
    });
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const constructorName = (value as { constructor?: { name?: string } })
    .constructor?.name;
  if (constructorName !== "DecimalBigNum" && constructorName !== "BigNum") {
    return value;
  }
  const primitive = (value as { valueOf: () => unknown }).valueOf();
  return typeof primitive === "bigint" ? Number(primitive) : primitive;
}

function arrowTableToJS<RowObject extends UnknownRow>(
  arrowTable: arrow.Table<Record<string, arrow.DataType>>,
  { logger = Logger }: { logger?: ILogger } = {},
): QueryResult.T<RowObject> {
  const jsDataRows = arrowTable.toArray().map((row): RowObject => {
    const jsRow = row.toJSON();
    return objectValuesMap(jsRow, _toJsValueFromArrowValue) as RowObject;
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

  async #initialize(): Promise<duckdb.AsyncDuckDB> {
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

    const conn = await db.connect();
    const loadNetworkExtensions = shouldLoadDuckDbNetworkExtensions({
      isDisableDuckDbSpatialFlagEnabled: isFlagEnabled(
        FeatureFlag.DisableDuckDbSpatial,
      ),
      hasPthreadWorker: bundle.pthreadWorker != null,
    });

    // Spatial / excel are fetched from `extensions.duckdb.org` on each fresh
    // AsyncDuckDB init (DuckDb-WASM does not persist extensions across page
    // loads). When offline, both fetches throw; we let init succeed without
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
  async getTableRowCount(
    options: Readonly<{
      tableName: string;
      datasetDuckDbLease?: DatasetDuckDbLease;
    }>,
  ): Promise<number> {
    const { datasetDuckDbLease, tableName } = options;
    const result = await this.runRawQuery<{ count: bigint }>(
      `SELECT count(*) as count FROM "$tableName$"`,
      {
        params: { tableName },
        datasetDuckDbLease,
      },
    );
    return Number(result.data[0]?.count ?? 0);
  }

  /**
   * Gets the schema of a table
   * @param tableName The name of the table.
   * @returns The schema of the table as an array of
   * DuckDbColumnSchema objects.
   */
  async getTableSchema(
    options: Readonly<{
      tableName: string;
      datasetDuckDbLease?: DatasetDuckDbLease;
    }>,
  ): Promise<DuckDbColumnSchema[]> {
    const { datasetDuckDbLease, tableName } = options;
    const { data } = await this.runRawQuery<DuckDbColumnSchema>(
      `DESCRIBE "$tableName$"`,
      {
        params: { tableName },
        datasetDuckDbLease,
      },
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
  async #registerCsvFile(
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
  async dropTableViewAndFile(
    options: Readonly<{
      tableOrViewName: string;
      datasetDuckDbLease?: DatasetDuckDbLease;
    }>,
  ): Promise<void> {
    const { datasetDuckDbLease: providedLease, tableOrViewName } = options;
    return await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [tableOrViewName],
      lease: providedLease,
      operation: async (datasetDuckDbLease) => {
        DatasetDuckDbCoordinator.clearPublicSnapshotDatasetOwner(
          tableOrViewName,
        );
        try {
          const db = await this.#getDB();

          const hasView = await this.hasView(tableOrViewName);
          if (hasView) {
            await this.runRawQuery('DROP VIEW "$tableName$"', {
              params: { tableName: tableOrViewName },
              datasetDuckDbLease,
            });
          } else {
            const hasTable = await this.hasTable(tableOrViewName);
            if (hasTable) {
              await this.runRawQuery('DROP TABLE "$tableName$"', {
                params: { tableName: tableOrViewName },
                datasetDuckDbLease,
              });
            }
          }

          await db.dropFile(tableOrViewName);
        } catch (error: unknown) {
          DatasetDuckDbCoordinator.markDatasetDuckDbTableInvalid(
            tableOrViewName,
          );
          throw error;
        }
      },
    });
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
   * inferred column schema, and the first N rows, without transcoding
   * the file to parquet. Used by the sniff phase of the async import flow
   * so the import form can render its preview within hundreds of
   * milliseconds regardless of the source CSV's size; the full parquet
   * transcode via `loadCsv` runs separately as the background parquet
   * transcoding.
   *
   * Bytes read on disk are bounded by DuckDB's CSV sniff sample (a few
   * scan-buffer chunks) plus the LIMIT N read for the preview, so this
   * stays cheap for multi-GB files when the source is registered via
   * `BROWSER_FILEREADER`.
   */
  async sniffCsv(options: Readonly<SniffCsvOptions>): Promise<{
    csvSniff: DuckDbCsvSniffResult;
    columns: DuckDbColumnSchema[];
    previewRows: UnknownRow[];
  }> {
    const userHints = _getCsvParseUserHintsFromSniffOptions(options);
    const stagingFile = `sniff__${uuid()}.csv`;
    const conn = await this.#connect();
    try {
      await this.runRawQuery("DROP TABLE IF EXISTS reject_scans", { conn });
      await this.runRawQuery("DROP TABLE IF EXISTS reject_errors", { conn });

      await this.#registerCsvFile({
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

      const preview = await this.#getCsvPreviewData({
        conn,
        stagingFile,
        parseOptions,
        maxPreviewRows: options.maxPreviewRows,
      });
      const db = await this.#getDB();
      await db.dropFile(stagingFile);
      return this.#getCsvPreviewResult({
        stagingFile,
        sniffRow,
        parseOptions,
        preview,
      });
    } finally {
      await this.#closeConnection(conn);
    }
  }

  #getCsvPreviewResult(options: Readonly<CsvPreviewResultOptions>): {
    csvSniff: DuckDbCsvSniffResult;
    columns: DuckDbColumnSchema[];
    previewRows: UnknownRow[];
  } {
    return {
      csvSniff: this.#getCsvPreviewSniff(options),
      columns: options.preview.columns,
      previewRows: options.preview.previewRows,
    };
  }

  async #getCsvPreviewData(
    options: Readonly<CsvPreviewOptions>,
  ): Promise<CsvPreviewData> {
    const readCsvArgs = buildReadCsvArgList({
      parseOptions: options.parseOptions,
      mode: "preview",
    }).join(", ");
    const queryOptions = {
      conn: options.conn,
      params: { file: options.stagingFile },
      [TRUSTED_INTERNAL_SQL]: true as const,
    };
    const columnsResult = await this.runRawQuery<DuckDbColumnSchema>(
      `DESCRIBE SELECT * FROM read_csv('$file$', ${readCsvArgs})`,
      queryOptions,
    );
    const previewResult = await this.runRawQuery<UnknownRow>(
      `SELECT * FROM read_csv('$file$', ${readCsvArgs}) LIMIT ${options.maxPreviewRows}`,
      queryOptions,
    );
    return {
      columns: columnsResult.data,
      previewRows: previewResult.data,
      readCsvArgs,
    };
  }

  #getCsvPreviewSniff(
    options: Readonly<CsvPreviewSniffOptions>,
  ): DuckDbCsvSniffResult {
    return options.sniffRow ?
        buildDuckDbCsvSniffResultFromSniffRow({
          tableName: options.stagingFile,
          sniffRow: options.sniffRow,
          parseOptions: options.parseOptions,
        })
      : buildDuckDbCsvSniffResultFromResolved({
          tableName: options.stagingFile,
          parseOptions: options.parseOptions,
          columns: options.preview.columns.map((column) => {
            return {
              name: column.column_name,
              type: column.column_type,
            };
          }),
          userArguments: options.preview.readCsvArgs,
        });
  }

  async #writeCsvAttemptToParquet(
    options: Readonly<WriteCsvAttemptOptions>,
  ): Promise<{
    lastSniffRow: DuckDbSniffCsvRow | undefined;
    parseOptions: CsvParseResolvedOptions;
    shouldRetry: boolean;
  }> {
    const { conn, csvStagingFile, file, userHints } = options;
    await this.runRawQuery("DROP TABLE IF EXISTS reject_scans", { conn });
    await this.runRawQuery("DROP TABLE IF EXISTS reject_errors", { conn });
    const sniffed = await _sniffCsvWithDuckDb({
      runRawQuery: this.runRawQuery.bind(this),
      conn,
      stagingFile: csvStagingFile,
      userHints,
      parseOptions: options.parseOptions,
      file,
    });
    try {
      await this.#copyCsvAttemptToParquet({
        conn,
        csvStagingFile,
        parquetStagingFile: options.parquetStagingFile,
        parseOptions: sniffed.parseOptions,
      });
      return { ...sniffed, lastSniffRow: sniffed.sniffRow, shouldRetry: false };
    } catch (error) {
      return this.#getCsvRetryResultFromError({
        attemptIndex: options.attemptIndex,
        error,
        sniffed,
      });
    }
  }

  #getCsvRetryResultFromError(
    options: Readonly<{
      attemptIndex: number;
      error: unknown;
      sniffed: Awaited<ReturnType<typeof _sniffCsvWithDuckDb>>;
    }>,
  ): {
    lastSniffRow: DuckDbSniffCsvRow | undefined;
    parseOptions: CsvParseResolvedOptions;
    shouldRetry: true;
  } {
    if (
      options.attemptIndex >= MAX_CSV_PARSE_ATTEMPTS - 1 ||
      !isRecoverableCsvParseError(options.error)
    ) {
      throw options.error;
    }
    const { parseOptions, sniffRow } = options.sniffed;
    return {
      parseOptions:
        parseOptions.quoteChar == null ?
          {
            ...parseOptions,
            quoteChar: DEFAULT_CSV_QUOTE_CHAR,
            escapeChar: parseOptions.escapeChar ?? DEFAULT_CSV_ESCAPE_CHAR,
          }
        : parseOptions,
      lastSniffRow: sniffRow,
      shouldRetry: true,
    };
  }

  async #copyCsvAttemptToParquet(
    options: Readonly<CopyCsvAttemptOptions>,
  ): Promise<void> {
    const readCsvArgs = buildReadCsvArgList({
      parseOptions: options.parseOptions,
      mode: "load",
    }).join(", ");
    await this.runRawQuery(
      `COPY (SELECT * FROM read_csv('$csvFile$', ${readCsvArgs}))
       TO '$pqFile$' (FORMAT PARQUET, COMPRESSION ZSTD)`,
      {
        conn: options.conn,
        params: {
          csvFile: options.csvStagingFile,
          pqFile: options.parquetStagingFile,
        },
        [TRUSTED_INTERNAL_SQL]: true,
      },
    );
  }

  async #getParquetStagingRowCount(
    options: Readonly<{
      conn: duckdb.AsyncDuckDBConnection;
      parquetStagingFile: string;
    }>,
  ): Promise<number> {
    const result = await this.runRawQuery<{ c: bigint }>(
      `SELECT count(*)::BIGINT as c FROM read_parquet('$pqFile$')`,
      {
        conn: options.conn,
        params: { pqFile: options.parquetStagingFile },
        [TRUSTED_INTERNAL_SQL]: true,
      },
    );
    return Number(result.data[0]?.c ?? 0);
  }

  async #getCsvRejectedData(
    options: Readonly<{
      conn: duckdb.AsyncDuckDBConnection;
      csvStagingFile: string;
    }>,
  ): Promise<{
    rejectedRows: DuckDbRejectedRow[];
    rejectedScans: DuckDbScan[];
  }> {
    const rejectedScansResult = await this.runRawQuery<DuckDbScan>(
      `SELECT * FROM reject_scans WHERE file_path='$csvFile$'`,
      { conn: options.conn, params: { csvFile: options.csvStagingFile } },
    );
    const rejectedScans = rejectedScansResult.data;
    if (!isNonEmptyArray(rejectedScans)) {
      return { rejectedRows: [], rejectedScans };
    }
    const rejectedRowsResult = await this.runRawQuery<DuckDbRejectedRow>(
      `SELECT * FROM reject_errors WHERE file_id='$fileId$'`,
      { conn: options.conn, params: { fileId: rejectedScans[0].file_id } },
    );
    return { rejectedRows: rejectedRowsResult.data, rejectedScans };
  }

  async #runCsvParseAttempts(
    options: Readonly<RunCsvParseAttemptsOptions>,
  ): Promise<CsvParseAttemptState> {
    let state: CsvParseAttemptState = {
      lastSniffRow: undefined,
      parseOptions: createCsvParseOptionsFromUserHints(options.userHints),
      rejectedRows: [],
      rejectedScans: [],
    };
    Logger.log("columns specified", { columns: state.parseOptions.columns });
    for (
      let attemptIndex = 0;
      attemptIndex < MAX_CSV_PARSE_ATTEMPTS;
      attemptIndex++
    ) {
      const writeResult = await this.#writeCsvAttemptToParquet({
        ...options,
        attemptIndex,
        parseOptions: state.parseOptions,
      });
      state = { ...state, ...writeResult };
      if (writeResult.shouldRetry) {
        continue;
      }
      const evaluated = await this.#evaluateCsvParseAttempt({
        ...options,
        attemptIndex,
        state,
      });
      state = evaluated.state;
      if (!evaluated.shouldRetry) {
        break;
      }
    }
    return state;
  }

  async #evaluateCsvParseAttempt(
    options: Readonly<EvaluateCsvParseAttemptOptions>,
  ): Promise<{ shouldRetry: boolean; state: CsvParseAttemptState }> {
    const stagingRowCount = await this.#getParquetStagingRowCount(options);
    const emptyOptions = resolveParseOptionsAfterEmptyStagingLoad({
      parseOptions: options.state.parseOptions,
      stagingRowCount,
    });
    if (emptyOptions && options.attemptIndex < MAX_CSV_PARSE_ATTEMPTS - 1) {
      await (await this.#getDB()).dropFile(options.parquetStagingFile);
      return {
        shouldRetry: true,
        state: { ...options.state, parseOptions: emptyOptions },
      };
    }
    const rejectedData = await this.#getCsvRejectedData(options);
    const refinedOptions = refineCsvParseOptionsAfterFailure({
      parseOptions: options.state.parseOptions,
      rejectedRows: rejectedData.rejectedRows,
    });
    const shouldRetry = shouldRetryCsvParse({
      attemptIndex: options.attemptIndex,
      maxAttempts: MAX_CSV_PARSE_ATTEMPTS,
      rejectedRows: rejectedData.rejectedRows,
      parseOptions: options.state.parseOptions,
      refinedOptions,
    });
    return {
      shouldRetry,
      state: {
        ...options.state,
        ...rejectedData,
        ...(shouldRetry ? { parseOptions: refinedOptions } : {}),
      },
    };
  }

  async #getCsvLoadResult(
    options: Readonly<CsvLoadResultOptions>,
  ): Promise<DuckDbLoadCsvResult> {
    await this.loadParquet({
      tableName: options.tableName,
      blob: options.parquetData,
      datasetDuckDbLease: options.datasetDuckDbLease,
    });
    const [tableColumns, csvRowCount] = await Promise.all([
      this.getTableSchema({
        tableName: options.tableName,
        datasetDuckDbLease: options.datasetDuckDbLease,
      }),
      this.getTableRowCount({
        tableName: options.tableName,
        datasetDuckDbLease: options.datasetDuckDbLease,
      }),
    ]);
    if (csvRowCount === 0) {
      throw new Error(
        "CSV load produced zero rows. The file may use quotes or column types that differ from the sniff sample.",
      );
    }
    Logger.log("tableColumns", { tableColumns });
    this.#logger.log("Successfully transcoded CSV into parquet!");
    return {
      id: uuid(),
      type: "csv",
      tableName: options.tableName,
      csvName: options.tableName,
      numRows: csvRowCount,
      columns: tableColumns,
      errors: {
        rejectedScans: options.rejectedScans,
        rejectedRows: options.rejectedRows,
      },
      numRejectedRows: options.rejectedRows.length,
      csvSniff: _getCsvSniffResult({ ...options, tableColumns }),
      parquetData: options.parquetData,
    };
  }

  async #loadCsv(
    options: DuckDbLoadCsvOptions & { datasetDuckDbLease: DatasetDuckDbLease },
  ): Promise<DuckDbLoadCsvResult> {
    const csvStagingFile = `${options.tableName}__loadCsv_src`;
    const parquetStagingFile = `${options.tableName}__loadCsv_pq`;
    const conn = await this.#connect();
    try {
      await this.dropTableViewAndFile({
        tableOrViewName: options.tableName,
        datasetDuckDbLease: options.datasetDuckDbLease,
      });
      await this.#registerCsvFile(
        "file" in options ?
          { tableName: csvStagingFile, file: options.file }
        : { tableName: csvStagingFile, fileText: options.fileText },
      );
      const parseState = await this.#runCsvParseAttempts({
        conn,
        csvStagingFile,
        parquetStagingFile,
        userHints: _csvParseUserHintsFromLoadOptions(options),
        file: "file" in options ? options.file : undefined,
      });
      const parquetData = await this.#getParquetBlobFromStagingFiles({
        sourceStagingFile: csvStagingFile,
        parquetStagingFile,
      });
      return await this.#getCsvLoadResult({
        ...parseState,
        datasetDuckDbLease: options.datasetDuckDbLease,
        parquetData,
        tableName: options.tableName,
      });
    } finally {
      await this.#closeConnection(conn);
    }
  }

  /** Loads a CSV while holding its bare table's dataset lease. */
  async loadCsv(
    options: Readonly<DuckDbLoadCsvOptions>,
  ): Promise<DuckDbLoadCsvResult> {
    return await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [options.tableName],
      lease: options.datasetDuckDbLease,
      operation: async (datasetDuckDbLease) => {
        return await this.#loadCsv({ ...options, datasetDuckDbLease });
      },
    });
  }

  async #registerXlsxStagingFile(
    options: Readonly<DuckDbLoadXlsxOptions & { xlsxStagingFile: string }>,
  ): Promise<void> {
    if ("file" in options) {
      _assertXlsxFileReadable(options.file);
      await this.#registerXlsxFile({
        tableName: options.xlsxStagingFile,
        file: options.file,
      });
      return;
    }
    await this.#registerXlsxFile({
      tableName: options.xlsxStagingFile,
      fileBytes: options.fileBytes,
    });
  }

  async #transcodeXlsxToParquet(
    options: Readonly<TranscodeXlsxOptions>,
  ): Promise<void> {
    const sheetClause =
      options.sheet ?
        `, sheet = '${_escapeSqlSingleQuotedLiteral(options.sheet)}'`
      : "";
    await this.runRawQuery(
      `COPY (
        SELECT * FROM read_xlsx(
          '$xlsxFile$', header = ${options.hasHeader} ${sheetClause}
        )
      ) TO '$pqFile$' (FORMAT PARQUET, COMPRESSION ZSTD)`,
      {
        conn: options.conn,
        datasetDuckDbLease: options.datasetDuckDbLease,
        [TRUSTED_INTERNAL_SQL]: true,
        params: {
          xlsxFile: options.xlsxStagingFile,
          pqFile: options.parquetStagingFile,
        },
      },
    );
  }

  async #getParquetBlobFromStagingFiles(
    options: Readonly<{
      parquetStagingFile: string;
      sourceStagingFile: string;
    }>,
  ): Promise<Blob> {
    const db = await this.#getDB();
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

  async #getXlsxLoadResult(
    options: Readonly<XlsxLoadResultOptions>,
  ): Promise<DuckDbLoadXlsxResult> {
    await this.loadParquet({
      tableName: options.tableName,
      blob: options.parquetData,
      datasetDuckDbLease: options.datasetDuckDbLease,
    });
    this.#logger.log("Successfully transcoded XLSX into parquet!");
    const [tableColumns, rowCount] = await Promise.all([
      this.getTableSchema(options),
      this.getTableRowCount(options),
    ]);
    return {
      id: uuid(),
      type: "xlsx",
      tableName: options.tableName,
      xlsxName: options.tableName,
      numRows: rowCount,
      columns: tableColumns,
      sheet: options.sheet,
      parquetData: options.parquetData,
    };
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
  async #loadXlsx(
    options: DuckDbLoadXlsxOptions & {
      datasetDuckDbLease: DatasetDuckDbLease;
    },
  ): Promise<DuckDbLoadXlsxResult> {
    const { tableName, sheet } = options;
    const hasHeader = options.hasHeader ?? true;
    const xlsxStagingFile = `${tableName}__loadXlsx_src`;
    const parquetStagingFile = `${tableName}__loadXlsx_pq`;
    const conn = await this.#connect();
    try {
      await this.dropTableViewAndFile({
        tableOrViewName: tableName,
        datasetDuckDbLease: options.datasetDuckDbLease,
      });
      await this.#registerXlsxStagingFile({ ...options, xlsxStagingFile });
      await this.#transcodeXlsxToParquet({
        conn,
        datasetDuckDbLease: options.datasetDuckDbLease,
        hasHeader,
        parquetStagingFile,
        sheet,
        xlsxStagingFile,
      });
      const parquetData = await this.#getParquetBlobFromStagingFiles({
        parquetStagingFile,
        sourceStagingFile: xlsxStagingFile,
      });
      return await this.#getXlsxLoadResult({
        tableName,
        datasetDuckDbLease: options.datasetDuckDbLease,
        parquetData,
        sheet,
      });
    } finally {
      await this.#closeConnection(conn);
    }
  }

  /** Loads an XLSX file while holding its bare table's dataset lease. */
  async loadXlsx(
    options: Readonly<DuckDbLoadXlsxOptions>,
  ): Promise<DuckDbLoadXlsxResult> {
    return await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [options.tableName],
      lease: options.datasetDuckDbLease,
      operation: async (datasetDuckDbLease) => {
        return await this.#loadXlsx({ ...options, datasetDuckDbLease });
      },
    });
  }

  async #createParquetView(
    options: Readonly<CreateParquetViewOptions>,
  ): Promise<void> {
    await options.conn.query("SET enable_external_file_cache = false");
    try {
      await this.runRawQuery(
        `CREATE VIEW IF NOT EXISTS "$tableName$" AS
    SELECT * $excludeClause$ $replaceClause$
    FROM read_parquet("$tableName$")`,
        {
          conn: options.conn,
          datasetDuckDbLease: options.datasetDuckDbLease,
          [TRUSTED_INTERNAL_SQL]: true,
          params: {
            tableName: options.tableName,
            replaceClause: options.replaceClause,
            excludeClause: options.excludeClause,
          },
        },
      );
    } finally {
      await options.conn.query("SET enable_external_file_cache = true");
    }
  }

  async #getParquetLoadResult(
    options: Readonly<{
      tableName: string;
      datasetDuckDbLease: DatasetDuckDbLease;
    }>,
  ): Promise<DuckDbLoadParquetResult> {
    DatasetDuckDbCoordinator.markDatasetDuckDbTableValidForWorkspace(
      options.tableName,
    );
    const [columns, rowCount] = await Promise.all([
      this.getTableSchema(options),
      this.getTableRowCount(options),
    ]);
    return {
      name: options.tableName,
      columns,
      id: uuid(),
      numRows: rowCount,
    };
  }

  /**
   * Loads a parquet file into DuckDB.
   * @param options The options for loading the parquet file.
   * @param options.tableName The name of the table to hold the raw data. This
   * also the file name that will be used in DuckDB's internal file system.
   * @param options.blob The parquet file to load.
   * @returns A promise that resolves when the file is loaded.
   */
  async #loadParquet(
    options: DuckDbLoadParquetOptions & {
      datasetDuckDbLease: DatasetDuckDbLease;
    },
  ): Promise<DuckDbLoadParquetResult> {
    const { tableName, blob, columnReplacements } = options;
    await this.dropTableViewAndFile({
      tableOrViewName: tableName,
      datasetDuckDbLease: options.datasetDuckDbLease,
    });
    await this.#registerParquetFile({ tableName, blob });

    const conn = await this.#connect();
    try {
      await this.#createParquetView({
        conn,
        datasetDuckDbLease: options.datasetDuckDbLease,
        tableName,
        ..._getParquetProjectionClauses(columnReplacements),
      });
      return await this.#getParquetLoadResult({
        tableName,
        datasetDuckDbLease: options.datasetDuckDbLease,
      });
    } finally {
      await this.#closeConnection(conn);
    }
  }

  /** Loads a parquet file while holding its bare table's dataset lease. */
  async loadParquet(
    options: Readonly<DuckDbLoadParquetOptions>,
  ): Promise<DuckDbLoadParquetResult> {
    return await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [options.tableName],
      lease: options.datasetDuckDbLease,
      operation: async (datasetDuckDbLease) => {
        return await this.#loadParquet({
          ...options,
          datasetDuckDbLease,
        });
      },
    });
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
    options?: RawQueryOptions & {
      returnType?: "js";
    },
  ): Promise<QueryResult.T<RowObject>>;
  async runRawQuery(
    queryString: string,
    options?: RawQueryOptions & {
      returnType: "parquet";
    },
  ): Promise<Blob>;
  async runRawQuery<RowObject extends UnknownRow = UnknownRow>(
    queryString: string,
    options: RawQueryOptions = {},
  ): Promise<Blob | QueryResult.T<RowObject>> {
    const queryStringToUse = _getQueryStringFromParams({
      queryString,
      params: options.params ?? {},
    });
    const plan = this.#getRawQueryExecutionPlan({ queryStringToUse, options });
    return await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: plan.datasetIds,
      lease: options.datasetDuckDbLease,
      operation: async () => {
        this.#prepareRawQueryDatasetTables({ options, plan });
        return await this.#executeRawQuery<RowObject>({
          options,
          queryString,
          queryStringToUse,
        });
      },
    });
  }

  #getRawQueryExecutionPlan(
    input: Readonly<{ options: RawQueryOptions; queryStringToUse: string }>,
  ): RawQueryExecutionPlan {
    const { options, queryStringToUse } = input;
    const analysis =
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(queryStringToUse);
    const isTrustedInternalSql =
      options.datasetTableReadMode !== "public" &&
      options[TRUSTED_INTERNAL_SQL] === true &&
      analysis.kind === "unsafe" &&
      analysis.reason === "uninspectable-source";
    if (analysis.kind === "unsafe" && !isTrustedInternalSql) {
      throw new Error(`Cannot safely execute DuckDB SQL: ${analysis.reason}`);
    }
    if (options.datasetTableReadMode === "public" && analysis.kind !== "read") {
      throw new Error("Public DuckDB queries must be read-only");
    }
    const publicSnapshotDuckDbOwner = options.publicSnapshotDuckDbOwner;
    if (
      options.datasetTableReadMode === "public" &&
      publicSnapshotDuckDbOwner === undefined
    ) {
      throw new Error(
        "Public DuckDB queries require an expected snapshot owner",
      );
    }
    const readDatasetIds =
      analysis.kind === "mutating" ?
        analysis.readDatasetIds
      : analysis.datasetIds;
    const mutatedDatasetIds =
      analysis.kind === "mutating" ? analysis.mutatedDatasetIds : [];
    const datasetIds = _mergeDuckDbDatasetIds(
      readDatasetIds,
      mutatedDatasetIds,
    );
    return {
      datasetIds,
      mutatedDatasetIds,
      publicSnapshotDuckDbOwner,
      readDatasetIds,
    };
  }

  #prepareRawQueryDatasetTables(
    input: Readonly<{ options: RawQueryOptions; plan: RawQueryExecutionPlan }>,
  ): void {
    const { options, plan } = input;
    if (options.datasetTableReadMode === "public") {
      if (plan.publicSnapshotDuckDbOwner === undefined) {
        throw new Error(
          "Public DuckDB queries require an expected snapshot owner",
        );
      }
      DatasetDuckDbCoordinator.assertPublicSnapshotDatasetOwners({
        datasetIds: plan.readDatasetIds,
        owner: plan.publicSnapshotDuckDbOwner,
      });
    } else {
      DatasetDuckDbCoordinator.assertWorkspaceDatasetTables(
        plan.readDatasetIds,
      );
    }
    plan.mutatedDatasetIds.forEach(
      DatasetDuckDbCoordinator.markDatasetDuckDbTableInvalid,
    );
  }

  async #executeRawQuery<RowObject extends UnknownRow>(
    input: Readonly<{
      options: RawQueryOptions;
      queryString: string;
      queryStringToUse: string;
    }>,
  ): Promise<Blob | QueryResult.T<RowObject>> {
    const { options, queryString, queryStringToUse } = input;
    const conn = options.conn ?? (await this.#connect());
    try {
      this.#logger.log("Executing query", { query: queryStringToUse });
      if ((options.returnType ?? "js") === "js") {
        const arrowTable =
          await conn.query<Record<string, arrow.DataType>>(queryStringToUse);
        return arrowTableToJS<RowObject>(arrowTable, { logger: this.#logger });
      }
      const tempViewName = uuid();
      await conn.query(
        `CREATE TEMP VIEW "${tempViewName}" AS ${queryStringToUse}`,
      );
      return await this.exportTableAsParquet(tempViewName, conn);
    } catch (error) {
      this.#logger.error(error, {
        executedQueryString: queryStringToUse,
        templatedQueryString: queryString,
      });
      throw error;
    } finally {
      if (conn !== options.conn) {
        await this.#closeConnection(conn);
      }
    }
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
  ): Promise<QueryResult.Page<T>> {
    const { tableName, pageSize, pageNum, totalRows } = queryParams;
    const pageData = await this.runStructuredQuery<T>({
      ...queryParams,
      limit: pageSize,
      offset: pageSize * pageNum,
    });

    const totalRowsInSource = await this.#getPageTotalRows({
      tableName,
      pageSize,
      pageNum,
      totalRows,
      pageData,
    });
    return {
      ...pageData,
      totalRows: totalRowsInSource,
      ...this.#getPageNavigation({
        pageSize,
        pageNum,
        totalRows: totalRowsInSource,
      }),
      pageNum,
    };
  }

  async #getPageTotalRows(
    options: Readonly<PageTotalRowsOptions>,
  ): Promise<number> {
    if (options.totalRows !== undefined) {
      return options.totalRows;
    }
    if (
      options.pageNum === 0 &&
      options.pageData.data.length < options.pageSize
    ) {
      return options.pageData.numRows;
    }
    return this.getTableRowCount({ tableName: options.tableName });
  }

  #getPageNavigation(
    options: Readonly<{
      pageSize: number;
      pageNum: number;
      totalRows: number;
    }>,
  ): Pick<
    QueryResult.Page<UnknownRow>,
    "totalPages" | "nextPage" | "prevPage"
  > {
    const totalPages =
      options.totalRows === 0 ?
        1
      : Math.ceil(options.totalRows / options.pageSize);
    return {
      totalPages,
      nextPage:
        options.pageNum + 1 === totalPages ? undefined : options.pageNum + 1,
      prevPage: options.pageNum === 0 ? undefined : options.pageNum - 1,
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
  >): Promise<QueryResult.Page<T>> {
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
    options: Readonly<{
      query: Omit<DuckDbStructuredQuery, "limit" | "offset"> & {
        pageSize?: number;
      };
      callback: (page: QueryResult.Page<T>) => void | Promise<void>;
    }>,
  ): Promise<{ numPages: number; numRows: number }> {
    const {
      selectColumnNames = "*",
      groupByColumnNames = [],
      aggregations = {},
      pageSize = 1000,
      ...restOfStructuredQuery
    } = options.query;
    const firstPage = await this.getPage<T>({
      ...restOfStructuredQuery,
      selectColumnNames,
      groupByColumnNames,
      aggregations,
      pageSize,
      pageNum: 0,
    });
    await options.callback(firstPage);
    return this.#iterateRemainingQueryPages({
      callback: options.callback,
      firstPage,
      query: {
        ...restOfStructuredQuery,
        selectColumnNames,
        groupByColumnNames,
        aggregations,
        pageSize,
      },
    });
  }

  async #iterateRemainingQueryPages<T extends UnknownRow>(
    options: Readonly<RemainingQueryPagesOptions<T>>,
  ): Promise<{ numPages: number; numRows: number }> {
    let numPages = 1;
    let numRows = options.firstPage.numRows;
    let nextPageNum = options.firstPage.nextPage;
    while (nextPageNum !== undefined) {
      const queryPage = await this.#getPageHelper<T>({
        ...options.query,
        pageNum: nextPageNum,
        totalRows: options.firstPage.totalRows,
      });
      await options.callback(queryPage);
      nextPageNum = queryPage.nextPage;
      numPages += 1;
      numRows += queryPage.numRows;
    }
    return { numPages, numRows };
  }

  #getStructuredSelectFields(
    input: Readonly<{
      structuredQuery: DuckDbStructuredQuery;
      tableColumns: DuckDbColumnSchema[];
    }>,
  ): Knex.Raw[] {
    const { structuredQuery, tableColumns } = input;
    const { aggregations = {}, selectColumnNames = "*" } = structuredQuery;
    const timestampColumnNames = new Set(
      tableColumns
        .filter((column) => {
          return DuckDbDataTypeUtils.isDateOrTimestamp(column.column_type);
        })
        .map(prop("column_name")),
    );
    const columnNames =
      selectColumnNames === "*" ?
        tableColumns.map(prop("column_name"))
      : selectColumnNames;
    const columnNamesWithoutAggregations = columnNames.filter((colName) => {
      return aggregations[colName] === undefined;
    });
    return columnNamesWithoutAggregations.map((columnName) => {
      const quotedColumnName = quoteSqlIdentifier(columnName);
      if (
        structuredQuery.castTimestampsToISO &&
        timestampColumnNames.has(columnName)
      ) {
        return sql.raw(
          `strftime(${quotedColumnName}::TIMESTAMP, '%Y-%m-%dT%H:%M:%S.%fZ') as ${quotedColumnName}`,
        );
      }
      return sql.raw(quotedColumnName);
    });
  }

  #buildStructuredQuery(
    input: Readonly<{
      selectFields: Knex.Raw[];
      structuredQuery: DuckDbStructuredQuery;
    }>,
  ): Knex.QueryBuilder {
    const { selectFields, structuredQuery } = input;
    const { aggregations = {}, groupByColumnNames = [] } = structuredQuery;
    let query = sql.select(...selectFields).from(structuredQuery.tableName);
    if (groupByColumnNames.length > 0) {
      query = query.groupByRaw(
        groupByColumnNames.map(quoteSqlIdentifier).join(", "),
      );
    }
    if (structuredQuery.orderByColumnName && structuredQuery.orderByDirection) {
      query = query.orderByRaw(
        `${quoteSqlIdentifier(structuredQuery.orderByColumnName)} ${structuredQuery.orderByDirection}`,
      );
    }
    query = objectEntries(aggregations).reduce(
      (currentQuery, [columnName, aggregationType]) => {
        return currentQuery.select(
          _getAggregationSelectExpression({ columnName, aggregationType }),
        );
      },
      query,
    );
    if (structuredQuery.limit) {
      query = query.limit(structuredQuery.limit);
    }
    if (structuredQuery.offset) {
      query = query.offset(structuredQuery.offset);
    }
    return query;
  }

  async #executeStructuredQuery<RowObject extends UnknownRow>(
    input: Readonly<{
      conn: duckdb.AsyncDuckDBConnection;
      query: Knex.QueryBuilder;
    }>,
  ): Promise<QueryResult.T<RowObject>> {
    try {
      const queryString = input.query.toString();
      const arrowTable =
        await input.conn.query<Record<string, arrow.DataType>>(queryString);
      return arrowTableToJS<RowObject>(arrowTable, {
        logger: this.#logger,
      });
    } catch (error) {
      this.#logger.error(error, { query: input.query.toString() });
      throw error;
    }
  }

  async #runStructuredQuery<RowObject extends UnknownRow>(
    options: Readonly<{
      structuredQuery: DuckDbStructuredQuery;
      datasetDuckDbLease: DatasetDuckDbLease;
    }>,
  ): Promise<QueryResult.T<RowObject>> {
    const conn = await this.#connect();
    try {
      const tableColumns = await this.getTableSchema({
        tableName: options.structuredQuery.tableName,
        datasetDuckDbLease: options.datasetDuckDbLease,
      });
      const selectFields = this.#getStructuredSelectFields({
        structuredQuery: options.structuredQuery,
        tableColumns,
      });
      const query = this.#buildStructuredQuery({
        selectFields,
        structuredQuery: options.structuredQuery,
      });
      return await this.#executeStructuredQuery<RowObject>({ conn, query });
    } finally {
      await this.#closeConnection(conn);
    }
  }

  /** Runs a structured query while holding its table's dataset lease. */
  async runStructuredQuery<RowObject extends UnknownRow>(
    options: Readonly<DuckDbStructuredQuery>,
  ): Promise<QueryResult.T<RowObject>> {
    return await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [options.tableName],
      operation: async (datasetDuckDbLease) => {
        DatasetDuckDbCoordinator.assertWorkspaceDatasetTables([
          options.tableName,
        ]);
        return await this.#runStructuredQuery<RowObject>({
          structuredQuery: options,
          datasetDuckDbLease,
        });
      },
    });
  }
}

export const DuckDbClient = new DuckDbClientImpl();
