import * as duckdb from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import { ILogger, Logger } from "$/lib/Logger/Logger";
import { MIMEType } from "$/lib/types/common";
import { objectEntries } from "$/lib/utils/objects/objectEntries/objectEntries";
import { objectKeys } from "$/lib/utils/objects/objectKeys/objectKeys";
import * as arrow from "apache-arrow";
import knex from "knex";
import { match } from "ts-pattern";
import { assertIsDefined } from "@/lib/utils/asserts";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { mapObjectValues } from "@/lib/utils/objects/transformations";
import { uuid } from "@/lib/utils/uuid";
import {
  QueryResult,
  QueryResultPage,
} from "@/models/queries/QueryResult/QueryResult.types";
import { arrowFieldToQueryResultField } from "./arrowFieldToQueryResultField";
import {
  DuckDBColumnSchema,
  DuckDBCSVSniffResult,
  DuckDBLoadCSVResult,
  DuckDBLoadParquetResult,
  DuckDBStructuredQuery,
} from "./DuckDBClient.types";
import { DuckDBDataType, DuckDBDataTypeUtils } from "./DuckDBDataType";
import { DuckDBQueryAggregations } from "./DuckDBQueryAggregations";
import { singleton } from "./queryResultHelpers";

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

type BaseDuckDBLoadCSVOptions = {
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
  columns?: Array<readonly [columnName: string, columnType: DuckDBDataType]>;
};

export type DucKDBLoadCSVOptions =
  | (BaseDuckDBLoadCSVOptions & { file: File })
  | (BaseDuckDBLoadCSVOptions & { fileText: string });

/**
 * An object representing a row with unknown column types.
 * This is very similar to `UnknownObject` except that keys can only be strings.
 */
export type UnknownRow = Record<string, unknown>;

function arrowTableToJS<RowObject extends UnknownRow>(
  arrowTable: arrow.Table<Record<string, arrow.DataType>>,
  { logger = Logger }: { logger?: ILogger } = {},
): QueryResult<RowObject> {
  const jsDataRows = arrowTable.toArray().map((row) => {
    const jsRow = row.toJSON();
    return mapObjectValues(jsRow, (v) => {
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
      return v;
    });
  });
  return {
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
class DuckDBClientImpl {
  #db?: Promise<duckdb.AsyncDuckDB>;

  /**
   * Tracking open connections. This is useful for debugging if we ever need to
   * know if we forgot to close any connections.
   */
  #openConnections: Set<duckdb.AsyncDuckDBConnection> = new Set();
  #logger: ILogger = Logger.appendName("DuckDBClient");

  async #initialize(): Promise<duckdb.AsyncDuckDB> {
    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

    // Instantiate the asynchronous version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    // enable the spatial extension
    // TODO(jpsyx): we should only do this when necessary
    const conn = await db.connect();
    await conn.query("LOAD spatial;");
    await conn.close();
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
   * DuckDBColumnSchema objects.
   */
  async getTableSchema(tableName: string): Promise<DuckDBColumnSchema[]> {
    const { data } = await this.runRawQuery<DuckDBColumnSchema>(
      `DESCRIBE "$tableName$"`,
      { params: { tableName } },
    );
    return data;
  }

  async hasTable(tableName: string): Promise<boolean> {
    const dbTableNames = await this.getTableNames();
    return dbTableNames.includes(tableName);
  }

  async hasView(viewName: string): Promise<boolean> {
    const { data } = await this.runRawQuery<{ count: bigint }>(
      `SELECT count(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'main'
          AND table_name = '$viewName$'
          AND table_type = 'VIEW'`,
      { params: { viewName } },
    );
    return Number(data[0]?.count ?? 0n) > 0;
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
   * Registers a Parquet file in DuckDB's internal file system.
   * @param options The options for registering the dataset.
   * @param options.tableName The name of the table to register the dataset
   * under. This must be a valid DuckDB table name. Calling `snakeify` on the
   * string before passing it to this function would be sufficient to ensure
   * the string is a valid table name.
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
    const fileContents = await blob.arrayBuffer();
    const parquetBuffer = new Uint8Array(fileContents);
    await db.registerFileBuffer(tableName, parquetBuffer);
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
   * @param options.hasHeader Whether the CSV file has a header.
   * @param options.dateFormat The date format to use for the CSV file.
   * @param options.timestampFormat The timestamp format to use for the CSV
   * file.
   * @param options.columns The columns to use for the CSV file, if we know
   * the schema of the CSV file ahead of time and want to make sure these
   * columns get used. The record keys are the column names, the values are
   * the DuckDBDataType of the column.
   * @param options.file The file to load. This takes precedence over
   * passing `fileText`.
   * @param options.fileText The raw CSV text string to load. If a `file`
   * is provided, this option will be ignored.
   * @returns A promise that resolves when the file is loaded.
   */
  async loadCSV(options: DucKDBLoadCSVOptions): Promise<DuckDBLoadCSVResult> {
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
      // If the dataset already exists, we drop it and then recreate it.
      // Loading a CSV will ALWAYS overwrite existing data.
      await this.dropTableViewAndFile(tableName);
      await this.#registerCSVFile(
        "file" in options ?
          { tableName, file: options.file }
        : { tableName, fileText: options.fileText },
      );

      const cleanCommentChar = commentChar === "(empty)" ? null : commentChar;
      const cleanEscapeChar = escapeChar === "(empty)" ? null : escapeChar;
      const cleanQuoteChar = quoteChar === "(empty)" ? null : quoteChar;
      const csvSniffResult = singleton(
        await this.runRawQuery<DuckDBCSVSniffResult>(
          `SELECT
            '$tableName$' AS table_name,
            t.* FROM sniff_csv(
              '$tableName$', 
              strict_mode=false,
              ignore_errors=false
              ${numRowsToSkip ? `, skip=${numRowsToSkip}` : ""}
              ${delimiter ? `, delim='${delimiter}'` : ""}
              ${cleanQuoteChar ? `, quote='${cleanQuoteChar}'` : ""}
              ${cleanEscapeChar ? `, escape='${cleanEscapeChar}'` : ""}
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
          { conn, params: { tableName } },
        ),
      );
      assertIsDefined(csvSniffResult, "CSV Sniff result is undefined");

      // Insert the CSV file as a VIEW (low-memory interactive querying).
      await this.runRawQuery(
        `CREATE VIEW "$tableName$" AS SELECT * $sniffCSVPrompt$`,
        {
          conn,
          params: {
            tableName,
            sniffCSVPrompt: csvSniffResult.Prompt,
          },
        },
      );

      this.#logger.log("Successfully loaded CSV into DuckDB!");

      // now let's collect all information we need to return
      const tableColumns = await this.getTableSchema(tableName);
      const csvRowCount = await this.getTableRowCount(tableName);

      loadResults = {
        id: uuid(),
        tableName,
        csvName: tableName,
        numRows: csvRowCount,
        columns: tableColumns,
        csvSniff: csvSniffResult,
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
  }): Promise<DuckDBLoadParquetResult> {
    const { tableName, blob } = options;
    const conn = await this.#connect();
    let loadResults: DuckDBLoadParquetResult;

    try {
      // Drop the dataset and recreate it. We are overwriting the data.
      await this.dropTableViewAndFile(tableName);
      await this.#registerParquetFile({ tableName, blob });

      // Re-ingest the parquet data into a view (low-memory querying).
      await this.runRawQuery(
        `CREATE VIEW "$tableName$" AS
            SELECT * FROM read_parquet('$tableName$')`,
        { conn, params: { tableName } },
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
   * Exports a table as a Parquet file using ZSTD compression (default).
   *
   * @param tableName The name of the table to export as a Parquet file.
   */
  async exportTableAsParquet(tableName: string): Promise<Blob> {
    try {
      const db = await this.#getDB();
      const tempParquetFileName = `${tableName}.temp`;

      await this.#copyTableToParquetWithZSTD({
        tableName,
        parquetFileName: tempParquetFileName,
      });

      const parquetBuffer: Uint8Array<ArrayBuffer> = (await db.copyFileToBuffer(
        tempParquetFileName,
      )) as Uint8Array<ArrayBuffer>;

      const parquetBlob = new Blob([parquetBuffer], {
        type: MIMEType.APPLICATION_PARQUET,
      });

      await db.dropFile(tempParquetFileName);
      return parquetBlob;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.#logger.error(error, {
        msg: "Failed to export table as parquet (ZSTD)",
        errMsg: errorMessage,
      });
      throw new Error(`Parquet export failed: ${errorMessage}`);
    }
  }

  async #copyTableToParquetWithZSTD(options: {
    tableName: string;
    parquetFileName: string;
  }): Promise<void> {
    const { tableName, parquetFileName } = options;

    try {
      await this.runRawQuery(
        `COPY '$tableName$' TO '$parquetFileName$' (
          FORMAT 'parquet',
          COMPRESSION 'ZSTD'
        )`,
        { params: { tableName, parquetFileName } },
      );
    } catch {
      await this.runRawQuery(
        `COPY '$tableName$' TO '$parquetFileName$' (
          FORMAT 'parquet',
          CODEC 'ZSTD'
        )`,
        { params: { tableName, parquetFileName } },
      );
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
   * @param options.conn The connection to use for the query. If not
   * provided, a new connection will be created. This is useful when previous
   * operations have created temporary data (e.g. transient tables) that will
   * not exist in a new connection. This gives you a way to continue querying
   * on a given connection.
   * @returns The results of the query.
   */
  async runRawQuery<RowObject extends UnknownRow = UnknownRow>(
    queryString: string,
    options: {
      params?: Record<string, string | number | bigint>;
      conn?: duckdb.AsyncDuckDBConnection;
    } = {},
  ): Promise<QueryResult<RowObject>> {
    const { params = {} } = options;
    const conn = options.conn ?? (await this.#connect());
    let queryResults: QueryResult<RowObject>;
    const paramNames = objectKeys(params);
    const queryStringToUse = paramNames.reduce((currQueryStr, paramName) => {
      return currQueryStr.replace(
        new RegExp(`\\$${paramName}\\$`, "g"),
        params[paramName] ? String(params[paramName]) : "",
      );
    }, queryString);

    try {
      this.#logger.log("Executing query", { query: queryStringToUse });
      // run the query
      const arrowTable =
        await conn.query<Record<string, arrow.DataType>>(queryStringToUse);
      queryResults = arrowTableToJS<RowObject>(arrowTable, {
        logger: this.#logger,
      });
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
      DuckDBStructuredQuery & {
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
    DuckDBStructuredQuery & { pageSize: number; pageNum: number },
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
    }: Omit<DuckDBStructuredQuery, "limit" | "offset"> & {
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
  }: DuckDBStructuredQuery): Promise<QueryResult<RowObject>> {
    const conn = await this.#connect();
    let queryResults: QueryResult<RowObject>;
    const tableColumns = await this.getTableSchema(tableName);
    const timestampColumnNames = tableColumns
      .filter((col) => {
        return DuckDBDataTypeUtils.isDateOrTimestamp(col.column_type);
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
          return timestampColumnNames.includes(colName) ?
              sql.raw(
                `strftime("${colName}"::TIMESTAMP, '%Y-%m-%dT%H:%M:%S.%fZ') as "${colName}"`,
              )
            : `${colName}`;
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
      (newQuery, [columnName, aggType]) => {
        const aggregationColumnName =
          DuckDBQueryAggregations.getAggregationColumnName(aggType, columnName);
        const aggregationColumn = { [aggregationColumnName]: columnName };

        return match(aggType)
          .with("sum", () => {
            return newQuery.sum(aggregationColumn);
          })
          .with("avg", () => {
            return newQuery.avg(aggregationColumn);
          })
          .with("count", () => {
            return newQuery.count(aggregationColumn);
          })
          .with("max", () => {
            return newQuery.max(aggregationColumn);
          })
          .with("min", () => {
            return newQuery.min(aggregationColumn);
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

export const DuckDBClient = new DuckDBClientImpl();
