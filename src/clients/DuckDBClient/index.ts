import * as duckdb from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import * as arrow from "apache-arrow";
import knex from "knex";
import { match } from "ts-pattern";
import { ILogger, Logger } from "@/lib/Logger";
import { assertIsDefined } from "@/lib/utils/asserts";
import { removeOPFSFile } from "@/lib/utils/browser/removeOPFSFile";
import { isNonEmptyArray, isString } from "@/lib/utils/guards";
import { wait } from "@/lib/utils/misc";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries, objectKeys } from "@/lib/utils/objects/misc";
import { mapObjectValues } from "@/lib/utils/objects/transformations";
import { uuid } from "@/lib/utils/uuid";
import { arrowFieldToQueryResultField } from "./arrowFieldToQueryResultField";
import { DuckDBDataType, DuckDBDataTypeUtils } from "./DuckDBDataType";
import { singleton } from "./queryResultHelpers";
import {
  DuckDBColumnSchema,
  DuckDBCSVSniffResult,
  DuckDBLoadCSVResult,
  DuckDBRejectedRow,
  DuckDBScan,
  QueryResultData,
  QueryResultDataPage,
  StructuredDuckDBQueryConfig,
} from "./types";

const DUCKDB_DB_PATH = "opfs://avandar.duckdb";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckDBWasm,
    mainWorker: mvpWorker,
  },
  eh: {
    mainModule: duckDBWasmEh,
    mainWorker: ehWorker,
  },
};

const sql = knex({
  client: "sqlite3",
  wrapIdentifier: (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  },
  useNullAsDefault: true,
});

async function ensurePersistence(): Promise<void> {
  const alreadyPersisting = await navigator.storage.persisted();
  if (!alreadyPersisting) {
    await navigator.storage.persist();
  }
}

/**
 * The maximum number of rejected rows to store in DuckDB per file.
 * During a scan, once we have hit this limit, the CSV will still
 * continue to parse, but any more rejected rows will be ignored.
 *
 * This limit is intentionally set to 1001 (instead of 1000), so that
 * if we hit this number of errors, our UI can correctly make statements
 * like "Over 1000 rows were rejected." If we left this at 1000, we would
 * not know if there were exaclty 1000 rows or greater.
 *
 * We do not want to store over this many rejected rows because its a waste
 * of space. But we do not want to make this number too low, because
 * for smaller error counts it is helpful for the user to know the exact
 * number of errors.
 */
const REJECTED_ROW_STORAGE_LIMIT = 1001;

/**
 * An object representing a row with unknown column types.
 * This is very similar to `UnknownObject` except that keys can only be strings.
 */
export type UnknownRow = Record<string, unknown>;

function arrowTableToJS<RowObject extends UnknownRow>(
  arrowTable: arrow.Table<Record<string, arrow.DataType>>,
): QueryResultData<RowObject> {
  const jsDataRows = arrowTable.toArray().map((row) => {
    const jsRow = row.toJSON();
    return mapObjectValues(jsRow, (v) => {
      if (v instanceof arrow.Vector) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return v.toArray().map((x: any) => {
          return x.toJSON();
        });
      }
      return v;
    });
  });
  return {
    columns: arrowTable.schema.fields.map(arrowFieldToQueryResultField),
    data: jsDataRows,
    numRows: jsDataRows.length,
  };
}

/**
 * A DuckDB client.
 *
 * TODO(jpsyx): convert this to a composable function rather than a class.
 */
class DuckDBClientImpl {
  #db?: Promise<duckdb.AsyncDuckDB>;

  /**
   * Tracking open connections. This is useful for debugging if we ever need to
   * know if we forgot to close any connections.
   * */
  #openConnections: Set<duckdb.AsyncDuckDBConnection> = new Set();
  #logger: ILogger = Logger.appendName("DuckDBClient");

  async #initialize(): Promise<duckdb.AsyncDuckDB> {
    Logger.log("calling initialize");
    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

    // Instantiate the asynchronous version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);

    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    // TODO(jpsyx): if we are in a browser that does not support OPFS
    // we will need to persist to indexedDB. we should handle this.
    try {
      await db.open({
        path: DUCKDB_DB_PATH,
        accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
        opfs: {
          fileHandling: "manual",
        },
      });
    } catch (err) {
      Logger.error("Failed to open duckdb", DUCKDB_DB_PATH);
      if (
        err instanceof Error &&
        "exception_type" in err &&
        "exception_message" in err &&
        isString(err.exception_type) &&
        isString(err.exception_message) &&
        err.exception_type === "IO" &&
        err.exception_message.includes("not a valid DuckDB database")
      ) {
        Logger.log("Attemping to remove and then re-create the database");
        // re-create the database
        await removeOPFSFile(DUCKDB_DB_PATH);
        await db.open({
          path: DUCKDB_DB_PATH,
          accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
          opfs: {
            fileHandling: "manual",
          },
        });
      } else {
        await db.terminate();
        throw err; // we do not return a half-initialized DB
      }
    }

    await ensurePersistence();
    return db;
  }

  async #getDB(): Promise<duckdb.AsyncDuckDB> {
    if (!this.#db) {
      this.#db = this.#initialize();
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

  async hasTable(tableName: string): Promise<boolean> {
    const dbTableNames = await this.getTableNames();
    return dbTableNames.includes(tableName);
  }

  /**
   * Registers a dataset from a CSV file.
   * @param tableName The name of the table to register the dataset under.
   * This must be a valid DuckDB table name. Calling `snakeify` on the string
   * before passing it to this function would be sufficient to ensure
   * the string is a valid table name.
   * @param options The options for registering the dataset.
   */
  async #registerDatasetFromCSV(
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
   * Registers a dataset from a Parquet file.
   * @param tableName The name of the table to register the dataset under.
   * This must be a valid DuckDB table name. Calling `snakeify` on the string
   * before passing it to this function would be sufficient to ensure
   * the string is a valid table name.
   * @param options The options for registering the dataset.
   */
  /*
  async #registerDatasetFromParquet(options: {
    tableName: string;
    blob: Blob;
  }): Promise<void> {
    const { tableName, blob } = options;
    if (blob.type !== MIMEType.APPLICATION_PARQUET) {
      throw new Error("Blob is not a parquet file");
    }
    const db = await this.#getDB();

    await db.registerFileBuffer(tableName, parquetBuffer);
  }
  */

  /**
   * Drops a file from DuckDB's internal file system. Also drops any extra
   * metadata we collected about this file or its raw data.
   * @param tableName The name of the dataset file to drop from DuckDB.
   */
  async dropDataset(tableName: string): Promise<void> {
    const db = await this.#getDB();

    // delete the table associated to this file
    await this.runRawQuery('DROP TABLE IF EXISTS "$tableName$"', {
      tableName,
    });

    // finally, drop the file from DuckDB's internal file system
    await db.dropFile(tableName);
  }

  async #persistDB(conn: duckdb.AsyncDuckDBConnection): Promise<void> {
    await conn.query("CHECKPOINT");
  }

  /**
   * Syncs the DuckDB database with the browser's OPFS file system
   * and then closes the connection.
   */
  async #persistAndCloseConnection(
    conn: duckdb.AsyncDuckDBConnection,
  ): Promise<void> {
    await this.#persistDB(conn);
    await this.#closeConnection(conn);
  }

  /**
   * Loads a CSV file into DuckDB.
   * @param options The options for loading the CSV file.
   * @param options.tableName The name of the table that the CSV was registered
   * under in DuckDB.
   * @param options.numRowsToSkip The number of rows to skip at the beginning
   * of the csv text. Defaults to `0`
   * @param options.delimiter The delimiter to use for the CSV file.
   * @param options.columns The columns to use for the CSV file, if we know
   * the schema of the CSV file ahead of time and want to make sure these
   * columns get used. The record keys are the column names, the values are
   * the DuckDBDataType of the column.
   * @returns A promise that resolves when the file is loaded.
   */
  async loadCSV(
    options: {
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
      columns?: Array<
        readonly [columnName: string, columnType: DuckDBDataType]
      >;
    } & ({ file: File } | { fileText: string }),
  ): Promise<DuckDBLoadCSVResult> {
    const {
      tableName,
      numRowsToSkip = 0,
      delimiter,
      columns,
      quoteChar,
      escapeChar,
      newlineDelimiter,
      commentChar,
      hasHeader,
      dateFormat,
      timestampFormat,
    } = options;
    const conn = await this.#connect();
    let loadResults: DuckDBLoadCSVResult;

    try {
      // if the dataset already exists, we drop it and then recreate it.
      // Loading a CSV will ALWAYS overwrite existing data.
      await this.dropDataset(tableName);

      await this.#registerDatasetFromCSV(
        "file" in options ?
          { tableName, file: options.file }
        : { tableName, fileText: options.fileText },
      );

      const cleanCommentChar = commentChar === "(empty)" ? null : commentChar;

      const csvSniffResult = singleton(
        await this.runRawQuery<DuckDBCSVSniffResult>(
          `SELECT
          '$tableName$' AS table_name,
          t.* FROM sniff_csv(
            '$tableName$', 
            strict_mode=false,
            ignore_errors=true
            ${numRowsToSkip ? `, skip=${numRowsToSkip}` : ""}
            ${delimiter ? `, delim='${delimiter}'` : ""}
            ${quoteChar ? `, quote='${quoteChar}'` : ""}
            ${escapeChar ? `, escape='${escapeChar}'` : ""}
            ${newlineDelimiter ? `, new_line='${newlineDelimiter}'` : ""}
            ${cleanCommentChar ? `, comment='${cleanCommentChar}'` : ""}
            ${hasHeader ? `, header=${hasHeader}` : ""}
            ${dateFormat ? `, dateformat='${dateFormat}'` : ""}
            ${timestampFormat ? `, timestampformat='${timestampFormat}'` : ""}
            ${
              columns ?
                `, columns={${columns
                  .map(([name, type]) => {
                    return `'${name}': '${type}'`;
                  })
                  .join(",")}}`
              : ""
            }
          ) t
        `,
          { tableName },
          { conn },
        ),
      );
      assertIsDefined(csvSniffResult, "CSV Sniff result is undefined");

      // insert the CSV file as a table
      await this.runRawQuery(
        'CREATE TABLE "$tableName$" AS SELECT * $sniffCSVPrompt$',
        {
          tableName: tableName,
          sniffCSVPrompt: csvSniffResult.Prompt.replace(
            "ignore_errors=true",
            `encoding='utf-8',
              store_rejects=true,
              rejects_scan='reject_scans',
              rejects_table='reject_errors',
              rejects_limit=${REJECTED_ROW_STORAGE_LIMIT}`,
          ),
        },
        { conn },
      );

      // get the parsing errors
      let rejectedScans: DuckDBScan[] = [];
      let rejectedRows: DuckDBRejectedRow[] = [];
      const rejectedScansResult = await this.runRawQuery<DuckDBScan>(
        `SELECT * FROM reject_scans WHERE file_path='$tableName$'`,
        { tableName },
        { conn },
      );
      rejectedScans = rejectedScansResult.data;

      if (isNonEmptyArray(rejectedScans)) {
        // if there are scans, then let's see if there are any rejected rows
        const fileId = rejectedScans[0].file_id;
        const rejectedRowsResult = await this.runRawQuery<DuckDBRejectedRow>(
          `SELECT * FROM reject_errors WHERE file_id='$fileId$'`,
          { fileId },
          { conn },
        );
        rejectedRows = rejectedRowsResult.data;
      }

      this.#logger.log("Successfully loaded CSV into DuckDB!");

      // now let's collect all information we need to return
      const tableColumns = await this.getTableSchema(tableName);
      const csvRowCount = await this.getTableRowCount(tableName);
      const csvErrors = {
        rejectedScans,
        rejectedRows,
      };

      loadResults = {
        id: uuid(),
        tableName,
        csvName: tableName,
        numRows: csvRowCount,
        columns: tableColumns,
        errors: csvErrors,
        numRejectedRows: csvErrors.rejectedRows.length,
        csvSniff: csvSniffResult,
      };
    } finally {
      await this.#persistAndCloseConnection(conn);
    }

    return loadResults;
  }

  /**
   * Loads a parquet file into DuckDB.
   * @param options The options for loading the parquet file.
   * @param options.tableName The name of the table to create.
   * @param options.blob The parquet file to load.
   * @returns A promise that resolves when the file is loaded.
   */
  /*
  async loadParquet(options: {
    tableName: string;
    blob: Blob;
  }): Promise<DuckDBLoadParquetResult> {
    const { tableName, blob } = options;
    const conn = await this.#connect();
    let loadResults: DuckDBLoadParquetResult;

    try {
      // Drop the dataset and recreate it. We are overwriting the data.
      await this.dropDataset(tableName);

      const isDataAlreadyLoaded = await this.hasTable(tableName);
      if (!isDataAlreadyLoaded) {
        await this.#registerDatasetFromParquet({ tableName, blob });

        // reingest the parquet data into a table if it doesn't
        // already exist
        await this.runRawQuery(
          `CREATE TABLE IF NOT EXISTS "$tableName$" AS
            SELECT * FROM read_parquet('$tableName$')`,
          { tableName },
        );
      }

      // now let's collect all information we need to return
      const columns = await this.getTableSchema(tableName);
      const csvRowCount = await this.getTableRowCount(tableName);

      loadResults = {
        name: tableName,
        columns,
        id: uuid(),
        numRows: csvRowCount,
      };
    } finally {
      await this.#persistAndCloseConnection(conn);
    }
    return loadResults;
  }
  */

  /**
   * Gets the number of rows in a table.
   * @param tableName
   * @returns The number of rows.
   */
  async getTableRowCount(tableName: string): Promise<number> {
    const result = await this.runRawQuery<{ count: bigint }>(
      `SELECT count(*) as count FROM "$tableName$"`,
      { tableName },
    );
    return Number(result.data[0]?.count ?? 0);
  }

  /**
   * Gets the schema of a table
   * @param tableName The name of the table.
   * @returns The schema of the table as an array of
   * DuckDBColumnSchema objects.
   */
  async getTableSchema(tableName: string): Promise<DuckDBColumnSchema[]> {
    const { data } = await this.runRawQuery<DuckDBColumnSchema>(
      `DESCRIBE "$tableName$"`,
      { tableName },
    );
    return data;
  }

  /*
  async exportTableAsParquet(tableName: string): Promise<Blob> {
    const db = await this.#getDB();
    const parquetFileName = `${tableName}.parquet`;

    // create the parquet file in the DuckDB internal file system
    await this.runRawQuery(
      `COPY '$tableName$' TO '$parquetFileName$' (FORMAT parquet)`,
      { tableName, parquetFileName },
    );
    const parquetBuffer = await db.copyFileToBuffer(parquetFileName);
    const parquetBlob = new Blob([parquetBuffer], {
      type: MIMEType.APPLICATION_PARQUET,
    });

    // now drop the parquet file now that we've successfully exported it
    await db.dropFile(parquetFileName);
    return parquetBlob;
  }
  */

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
   * @param params The parameters to replace in the query string.
   * @param options Additional options for the query
   * @param options.conn The connection to use for the query. If not
   * provided, a new connection will be created. This is useful when previous
   * operations have created temporary data (e.g. transient tables) that will
   * not exist in a new connection. This gives you a way to continue querying
   * on a given connection.
   * @returns The results of the query.
   */
  async runRawQuery<RowObject extends UnknownRow = UnknownRow>(
    queryString: string,
    params: Record<string, string | number | bigint> = {},
    options: {
      conn?: duckdb.AsyncDuckDBConnection;
    } = {},
  ): Promise<QueryResultData<RowObject>> {
    const conn = options.conn ?? (await this.#connect());
    let queryResults: QueryResultData<RowObject>;
    try {
      let queryStringToUse = queryString;
      const paramNames = objectKeys(params);
      queryStringToUse = paramNames.reduce((currQueryStr, paramName) => {
        return currQueryStr.replace(
          new RegExp(`\\$${paramName}\\$`, "g"),
          String(params[paramName]!),
        );
      }, queryString);

      this.#logger.log("Executing query", { query: queryStringToUse });
      // run the query
      const arrowTable =
        await conn.query<Record<string, arrow.DataType>>(queryStringToUse);
      queryResults = arrowTableToJS<RowObject>(arrowTable);
    } catch (error) {
      this.#logger.error(error, { queryString });
      throw error;
    } finally {
      // the query may have written data, so we need to also make sure we
      // persist any changes
      if (options.conn) {
        // if the connection was provided, we only persist changes. It should
        // be up to the caller to close the connection
        await this.#persistDB(options.conn);
      } else {
        // if we created the connection in this function then we persist AND
        // close the connection
        await this.#persistAndCloseConnection(conn);
      }
    }

    return queryResults;
  }

  async #getPageHelper<T extends UnknownRow>(
    queryParams: Omit<
      StructuredDuckDBQueryConfig & {
        pageSize: number;
        pageNum: number;
        totalRows: number | undefined;
      },
      "limit" | "offset"
    >,
  ): Promise<QueryResultDataPage<T>> {
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
    StructuredDuckDBQueryConfig & { pageSize: number; pageNum: number },
    "limit" | "offset"
  >): Promise<QueryResultDataPage<T>> {
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
      pageSize = 500,
      ...restOfStructuredQuery
    }: Omit<StructuredDuckDBQueryConfig, "limit" | "offset"> & {
      pageSize?: number;
    },
    callback: (page: QueryResultDataPage<T>) => void | Promise<void>,
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

  async runStructuredQuery<T extends UnknownRow>({
    tableName,
    selectColumnNames = "*",
    groupByColumnNames = [],
    aggregations = {},
    orderByColumnName,
    orderByDirection,
    castTimestampsToISO,
    limit,
    offset,
  }: StructuredDuckDBQueryConfig): Promise<QueryResultData<T>> {
    const conn = await this.#connect();
    let queryResults: QueryResultData<T>;
    const tableColumns = await this.getTableSchema(tableName);
    const timestampColumnNames = tableColumns
      .filter((col) => {
        return DuckDBDataTypeUtils.isDateOrTimestamp(col.column_type);
      })
      .map(getProp("column_name"));

    const columnNames =
      selectColumnNames === "*" ?
        tableColumns.map(getProp("column_name"))
      : selectColumnNames;

    const columnNamesWithoutAggregations = columnNames.filter((colName) => {
      return (
        aggregations[colName] === undefined || aggregations[colName] === "none"
      );
    });

    // if requested, cast any timestamp columns that will go in the SELECT
    // clause to ISO strings
    const adjustedFieldNames =
      castTimestampsToISO ?
        columnNamesWithoutAggregations.map((colName) => {
          return timestampColumnNames.includes(colName) ?
              sql.raw(
                `strftime("${colName}"::TIMESTAMP, '%Y-%m-%dT%H:%M:%S.%fZ') as "${colName}"`,
              )
            : `"${colName}"`;
        })
      : columnNamesWithoutAggregations;

    let query = sql.select(...adjustedFieldNames).from(tableName);
    if (groupByColumnNames.length > 0) {
      query = query.groupBy(...groupByColumnNames);
    }

    if (orderByColumnName && orderByDirection) {
      query = query.orderBy(orderByColumnName, orderByDirection);
    }

    // apply aggregations
    query = objectEntries(aggregations).reduce(
      (newQuery, [fieldName, aggType]) => {
        return match(aggType)
          .with("sum", () => {
            return query.sum(fieldName);
          })
          .with("avg", () => {
            return query.avg(fieldName);
          })
          .with("count", () => {
            return query.count(fieldName);
          })
          .with("max", () => {
            return query.max(fieldName);
          })
          .with("min", () => {
            return query.min(fieldName);
          })
          .with("none", () => {
            return newQuery;
          })
          .exhaustive(() => {
            return newQuery;
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
      const results =
        await conn.query<Record<string, arrow.DataType>>(queryString);

      const jsDataRows = results.toArray().map((row) => {
        return row.toJSON();
      });

      this.#logger.log("Ran query", {
        queryString,
        numResults: jsDataRows.length,
      });

      queryResults = {
        columns: results.schema.fields.map(arrowFieldToQueryResultField),
        data: jsDataRows,
        numRows: jsDataRows.length,
      };
    } catch (error) {
      this.#logger.error(error, { query: query.toString() });
      throw error;
    } finally {
      await this.#closeConnection(conn);
    }

    return queryResults;
  }

  async deleteDatabase(): Promise<void> {
    const db = await this.#getDB();
    const tableNames = await this.getTableNames();
    const dropStatements = tableNames.map((name) => {
      return `DROP TABLE IF EXISTS "${name}";`;
    });
    const conn = await this.#connect();
    await this.runRawQuery(
      `BEGIN; $dropStatements$ COMMIT;`,
      { dropStatements: dropStatements.join(" ") },
      { conn },
    );

    // persist the cleared DB one last time
    await this.#persistAndCloseConnection(conn);

    // now close all connections in case we left any dangling
    this.#openConnections.forEach((c) => {
      c.close();
    });

    // now close the connection, detach the DB,
    // terminate the worker, delete the file
    db.detach();
    await db.terminate();

    // small delay to let OPFS release underlying locks
    await wait(100);
    await removeOPFSFile("avandar.duckdb.wal");
    await removeOPFSFile("avandar.duckdb");
  }
}

export const DuckDBClient = new DuckDBClientImpl();
