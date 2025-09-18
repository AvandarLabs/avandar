import * as duckdb from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import * as arrow from "apache-arrow";
import knex from "knex";
import { match } from "ts-pattern";
import { ILogger, Logger } from "@/lib/Logger";
import { MIMEType } from "@/lib/types/common";
import { removeOPFSFile } from "@/lib/utils/browser/removeOPFSFile";
import { isNonEmptyArray, isString } from "@/lib/utils/guards";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries, objectKeys } from "@/lib/utils/objects/misc";
import { mapObjectValues } from "@/lib/utils/objects/transformations";
import { uuid } from "@/lib/utils/uuid";
import { arrowFieldToQueryResultField } from "./arrowFieldToQueryResultField";
import {
  DuckDBColumnSchema,
  DuckDBCSVSniffResult,
  DuckDBLoadCSVResult,
  DuckDBLoadParquetResult,
  DuckDBRejectedRow,
  DuckDBScan,
  LoadCSVErrors,
  QueryResultData,
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

const META_TABLE_NAMES = {
  CSV_REJECT_SCANS: "csv_reject_scans",
  CSV_REJECT_ERRORS: "csv_reject_errors",
  CSV_SNIFFS: "csv_sniffs",
} as const;

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
    fields: arrowTable.schema.fields.map(arrowFieldToQueryResultField),
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
  #conn?: duckdb.AsyncDuckDBConnection;

  /**
   * Number of unresolved operations. This is used to keep track of how many
   * `withConnection` calls have been made, so that we can know when to
   * actually close a connection.
   */
  #unresolvedOperations: number = 0;

  #logger: ILogger = Logger.appendName("DuckDBClient");

  async #initialize(): Promise<duckdb.AsyncDuckDB> {
    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

    // Instantiate the asynchronous version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);

    this.#db = Promise.resolve(db);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    // TODO(jpsyx): if we are in a browser that does not support OPFS
    // we will need to persist to indexedDB. we should handle this.
    try {
      await db.open({
        path: DUCKDB_DB_PATH,
        accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
      });
    } catch (err) {
      if (
        err instanceof Error &&
        "exception_type" in err &&
        "exception_message" in err &&
        isString(err.exception_type) &&
        isString(err.exception_message) &&
        err.exception_type === "IO" &&
        err.exception_message.includes("not a valid DuckDB database")
      ) {
        // re-create the database
        await removeOPFSFile(DUCKDB_DB_PATH);
        await db.open({
          path: DUCKDB_DB_PATH,
          accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
        });
      }
    }
    return db;
  }

  async #getDB(): Promise<duckdb.AsyncDuckDB> {
    if (!this.#db) {
      this.#db = this.#initialize();
    }
    return this.#db;
  }

  /**
   * Runs a database operation with a connection. Wrap any operation
   * that requires a connection in this method so that the connection
   * is properly closed after the operation.
   * @param operationFn The function to run with the connection.
   * @param operationFn.params - The argument the `operationFn` receives.
   * @param operationFn.params.db - The database instance.
   * @param operationFn.params.conn - The connection instance.
   * @returns The result of the operation.
   */
  async #withConnection<T>(
    operationFn: (params: {
      db: duckdb.AsyncDuckDB;
      conn: duckdb.AsyncDuckDBConnection;
    }) => Promise<T>,
  ): Promise<T> {
    const db = await this.#getDB();
    if (this.#conn === undefined) {
      // if there's no active connection, create a new one
      this.#conn = await db.connect();
    }

    try {
      this.#unresolvedOperations += 1;
      return await operationFn({ db, conn: this.#conn });
    } finally {
      this.#unresolvedOperations -= 1;
      if (this.#unresolvedOperations === 0) {
        // close the connection
        await this.#conn?.close();
        this.#conn = undefined;
      }
    }
  }

  async getTableNames(): Promise<string[]> {
    return await this.#withConnection(async ({ conn }) => {
      // get all table names
      const result = await conn.query<{ table_name: arrow.DataType }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'main' AND table_type = 'BASE TABLE'
      `);
      const tableNames: string[] = result.toArray().map((row) => {
        return row.table_name;
      });
      return tableNames;
    });
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
    await this.#withConnection(async ({ db }) => {
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
    });
  }

  /**
   * Registers a dataset from a Parquet file.
   * @param tableName The name of the table to register the dataset under.
   * This must be a valid DuckDB table name. Calling `snakeify` on the string
   * before passing it to this function would be sufficient to ensure
   * the string is a valid table name.
   * @param options The options for registering the dataset.
   */
  async #registerDatasetFromParquet(options: {
    tableName: string;
    blob: Blob;
  }): Promise<void> {
    const { tableName, blob } = options;
    if (blob.type !== MIMEType.APPLICATION_PARQUET) {
      throw new Error("Blob is not a parquet file");
    }
    const db = await this.#getDB();

    // convert the blob to a Uint8Array
    const parquetBuffer = new Uint8Array(await blob.arrayBuffer());
    await db.registerFileBuffer(tableName, parquetBuffer);
  }

  /**
   * Drops a file from DuckDB's internal file system. Also drops all
   * tables and information about rejected scans and rejected rows
   * that are associated with the file.
   * @param tableName The name of the dataset file to drop from DuckDB.
   */
  async dropDataset(tableName: string): Promise<void> {
    const db = await this.#getDB();

    // delete the table associated to this file
    await this.runRawQuery('DROP TABLE IF EXISTS "$tableName$"', {
      tableName,
    });

    const dbTableNames = await this.getTableNames();
    if (dbTableNames.includes(META_TABLE_NAMES.CSV_REJECT_ERRORS)) {
      // clear rejected rows from previous load attempts
      await this.runRawQuery(
        `DELETE FROM $csvRejectErrorsTable$
          USING $csvRejectScansTable$
          WHERE
            $csvRejectErrorsTable$.file_id = $csvRejectScansTable$.file_id AND
            $csvRejectScansTable$.file_path = '$tableName$';`,
        {
          tableName,
          csvRejectErrorsTable: META_TABLE_NAMES.CSV_REJECT_ERRORS,
          csvRejectScansTable: META_TABLE_NAMES.CSV_REJECT_SCANS,
        },
      );
    }

    if (dbTableNames.includes(META_TABLE_NAMES.CSV_REJECT_SCANS)) {
      // clear rejected scans from previous load attempts
      await this.runRawQuery(
        `DELETE FROM $csvRejectScansTable$
            WHERE $csvRejectScansTable$.file_path = '$tableName$';`,
        {
          tableName,
          csvRejectScansTable: META_TABLE_NAMES.CSV_REJECT_SCANS,
        },
      );
    }

    // clear previous CSV sniffs pertaining to this table
    if (dbTableNames.includes(META_TABLE_NAMES.CSV_SNIFFS)) {
      await this.runRawQuery(
        `DELETE FROM $csvSniffsTable$ WHERE table_name = '$tableName$';`,
        { tableName, csvSniffsTable: META_TABLE_NAMES.CSV_SNIFFS },
      );
    }

    // finally, drop the file from DuckDB's internal file system
    await db.dropFile(tableName);

    // persist the db to the browser file-system
    await this.#persistDB();
  }

  /**
   * Syncs the DuckDB database with the browser's OPFS file system.
   */
  async #persistDB(): Promise<void> {
    await this.#withConnection(async ({ conn }) => {
      await conn.query("CHECKPOINT");
    });
  }

  /**
   * Loads a CSV file into DuckDB.
   * @param options The options for loading the CSV file.
   * @param options.tableName The name of the table that the CSV was registered
   * under in DuckDB.
   * @param options.numRowsToSkip The number of rows to skip at the beginning
   * of the csv text. Defaults to `0`
   * @param options.delimiter The delimiter to use for the CSV file.
   * @param options.overwrite Defaults to `true`. When true, the existing
   * dataset will be overwritten. This includes the registered file, its
   * loaded raw data, and any metadata of previous load attempts (such as
   * rejected rows). If false and the data has already been previously loaded,
   * we will skip parsing the file again and instead return the
   * `DuckDBLoadCSVResult` from the previous load.
   * @returns A promise that resolves when the file is loaded.
   */
  async loadCSV(
    options: {
      tableName: string;
      numRowsToSkip?: number;
      delimiter?: string;
      overwrite?: boolean;
    } & ({ file: File } | { fileText: string }),
  ): Promise<DuckDBLoadCSVResult> {
    const {
      tableName,
      numRowsToSkip = 0,
      delimiter,
      overwrite = true,
    } = options;

    return await this.#withConnection(async ({ conn }) => {
      if (overwrite) {
        // if the dataset already exists, we drop it and then recreate it.
        // For now, CSV loading will ALWAYS overwrite the existing data
        await this.dropDataset(tableName);
      }

      const isDataAlreadyLoaded = await this.hasTable(tableName);
      if (!isDataAlreadyLoaded) {
        await this.#registerDatasetFromCSV(
          "file" in options ?
            { tableName, file: options.file }
          : { tableName, fileText: options.fileText },
        );

        // now we are ready to start loading the actual CSV data
        // first, we need to sniff the CSV to infer its schema and
        // parsing options
        const hasStrictOptionsToUse = !!numRowsToSkip || !!delimiter;
        const doesCSVSniffsTableExists = await this.hasTable(
          META_TABLE_NAMES.CSV_SNIFFS,
        );
        const csvSniffSQLStatement = `
            SELECT
              '${tableName}' AS table_name,
              t.* FROM sniff_csv(
                '${tableName}', 
                strict_mode=${hasStrictOptionsToUse ? "true" : "false"},
                ignore_errors=true
                ${numRowsToSkip ? `, skip=${numRowsToSkip}` : ""}
                ${delimiter ? `, delim='${delimiter}'` : ""}
              ) t
        `;

        if (doesCSVSniffsTableExists) {
          await conn.query(
            `INSERT INTO ${META_TABLE_NAMES.CSV_SNIFFS} ${csvSniffSQLStatement}`,
          );
        } else {
          // TODO(jpsyx): we should always assume all metadata tables exist.
          // They should get created explicitly at in #initialize(). But we'd
          // have to manually specify the schema of the table though.
          await conn.query(
            `CREATE TABLE IF NOT EXISTS ${META_TABLE_NAMES.CSV_SNIFFS} AS
            ${csvSniffSQLStatement}`,
          );
        }

        const sniffResult = await this.#getCSVSniffResult(tableName);

        // insert the CSV file as a table
        await this.runRawQuery(
          'CREATE TABLE "$tableName$" AS SELECT * $sniffCSVPrompt$',
          {
            tableName: tableName,
            sniffCSVPrompt: sniffResult.Prompt.replace(
              "ignore_errors=true",
              `encoding='utf-8',
                store_rejects=true,
                rejects_scan='reject_scans',
                rejects_table='reject_errors',
                rejects_limit=${REJECTED_ROW_STORAGE_LIMIT}`,
            ),
          },
        );

        // append the temporary error tables into permanent tables, so we can
        // keep references to rows that failed to parse
        await conn.query(
          `CREATE TABLE IF NOT EXISTS ${META_TABLE_NAMES.CSV_REJECT_SCANS} AS
            SELECT * FROM reject_scans
            WHERE 0; -- creates the table with the correct schema, but no rows

          INSERT INTO ${META_TABLE_NAMES.CSV_REJECT_SCANS}
            SELECT * FROM reject_scans;`,
        );
        await conn.query(
          `CREATE TABLE IF NOT EXISTS ${META_TABLE_NAMES.CSV_REJECT_ERRORS} AS
            SELECT * FROM reject_errors
            WHERE 0; -- creates the table with the correct schema, but no rows

          INSERT INTO ${META_TABLE_NAMES.CSV_REJECT_ERRORS}
            SELECT * FROM reject_errors;`,
        );
        this.#logger.log("Successfully loaded CSV into DuckDB!");
      }

      // now let's collect all information we need to return
      const columns = await this.getTableSchema(tableName);
      const csvRowCount = await this.getTableRowCount(tableName);
      const csvErrors = await this.#getCSVLoadErrors(tableName);
      const csvSniffResult = await this.#getCSVSniffResult(tableName);

      await this.#persistDB();

      return {
        id: uuid(),
        tableName,
        csvName: tableName,
        numRows: csvRowCount,
        columns,
        errors: csvErrors,
        numRejectedRows: csvErrors.rejectedRows.length,
        csvSniff: csvSniffResult,
      };
    });
  }

  /**
   * Loads a parquet file into DuckDB.
   * @param options The options for loading the parquet file.
   * @param options.tableName The name of the table to create.
   * @param options.blob The parquet file to load.
   * @param options.overwrite Defaults to `true`. When true, the existing
   * dataset will be overwritten. This includes the registered file and its
   * parsed data. If false and the data has already been previously loaded,
   * we will skip parsing and instead return the `DuckDBLoadParquetResult`
   * from the previous load.
   * @returns A promise that resolves when the file is loaded.
   */
  async loadParquet(options: {
    tableName: string;
    blob: Blob;
    overwrite?: boolean;
  }): Promise<DuckDBLoadParquetResult> {
    const { tableName, blob, overwrite = true } = options;
    return await this.#withConnection(async () => {
      if (overwrite) {
        await this.dropDataset(tableName);
      }

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

      await this.#persistDB();

      return {
        name: tableName,
        columns,
        id: uuid(),
        numRows: csvRowCount,
      };
    });
  }

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

  async #getCSVSniffResult(tableName: string): Promise<DuckDBCSVSniffResult> {
    const { data } = await this.runRawQuery<DuckDBCSVSniffResult>(
      `SELECT * FROM "$csvSniffsTable$" WHERE table_name = '$tableName$'`,
      { tableName, csvSniffsTable: META_TABLE_NAMES.CSV_SNIFFS },
    );
    return data[0]!;
  }

  async #getCSVLoadErrors(tableName: string): Promise<LoadCSVErrors> {
    try {
      const rejectedScansResult = await this.runRawQuery<DuckDBScan>(
        `SELECT * FROM csv_reject_scans WHERE file_path='$tableName$'`,
        { tableName },
      );
      const { data: rejectedScans } = rejectedScansResult;

      if (isNonEmptyArray(rejectedScans)) {
        // if there are scans, then let's see if there are any rejected rows
        const fileId = rejectedScans[0].file_id;
        const rejectedRows = await this.runRawQuery<DuckDBRejectedRow>(
          `SELECT * FROM csv_reject_errors WHERE file_id='${fileId}'`,
        );
        return { rejectedScans, rejectedRows: rejectedRows.data };
      }

      // no scans found, so there must also be no rejected rows
      return {
        rejectedScans,
        rejectedRows: [],
      };
    } catch (error) {
      this.#logger.error(error, { tableName });
      throw error;
    }
  }

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
   * @returns The results of the query.
   */
  async runRawQuery<RowObject extends UnknownRow = UnknownRow>(
    queryString: string,
    params: Record<string, string | number | bigint> = {},
  ): Promise<QueryResultData<RowObject>> {
    return await this.#withConnection(async ({ conn }) => {
      try {
        let queryStringToUse = queryString;
        const paramNames = objectKeys(params);
        queryStringToUse = paramNames.reduce((currQueryStr, paramName) => {
          return currQueryStr.replace(
            new RegExp(`\\$${paramName}\\$`, "g"),
            String(params[paramName]!),
          );
        }, queryString);

        // run the query
        const arrowTable =
          await conn.query<Record<string, arrow.DataType>>(queryStringToUse);
        return arrowTableToJS<RowObject>(arrowTable);
      } catch (error) {
        this.#logger.error(error, { queryString });
        throw error;
      }
    });
  }

  async runStructuredQuery({
    tableName,
    selectFields,
    groupByFields,
    aggregations,
    orderByColumn,
    orderByDirection,
  }: StructuredDuckDBQueryConfig): Promise<QueryResultData<UnknownRow>> {
    const selectFieldNames = selectFields.map(getProp("name"));
    const groupByFieldNames = groupByFields.map(getProp("name"));

    return this.#withConnection(async ({ conn }) => {
      const fieldNamesWithoutAggregations = selectFieldNames.filter(
        (fieldName) => {
          return aggregations[fieldName] === "none";
        },
      );

      // build the query
      let query = sql.select(...fieldNamesWithoutAggregations).from(tableName);
      if (groupByFieldNames.length > 0) {
        query = query.groupBy(...groupByFieldNames);
      }

      if (orderByColumn && orderByDirection) {
        query = query.orderBy(orderByColumn.name, orderByDirection);
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

        return {
          fields: results.schema.fields.map(arrowFieldToQueryResultField),
          data: jsDataRows,
          numRows: jsDataRows.length,
        };
      } catch (error) {
        Logger.error(error, { query: query.toString() });
        throw error;
      }
    });
  }

  async deleteDatabase(): Promise<void> {
    const tableNames = await this.getTableNames();
    const dropStatements = tableNames.map((name) => {
      return `DROP TABLE IF EXISTS "${name}";`;
    });
    const dropStatement = `BEGIN; ${dropStatements.join(" ")} COMMIT;`;
    await this.runRawQuery(dropStatement);

    // persist the cleared DB one last time
    await this.#persistDB();

    // now close the connection, detach the DB,
    // terminate the worker, delete the file
    const db = await this.#getDB();
    await this.#conn?.close();
    db.detach();
    await db.terminate();
    await removeOPFSFile("avandar.duckdb");
  }
}

export const DuckDBClient = new DuckDBClientImpl();
