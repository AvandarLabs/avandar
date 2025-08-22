import * as duck from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import * as arrow from "apache-arrow";
import { ILogger, Logger } from "@/lib/Logger";
import { UnknownObject } from "@/lib/types/common";
import { isNonEmptyArray } from "@/lib/utils/guards";
import { mapObjectValues } from "@/lib/utils/objects/transformations";
import { snakeify } from "@/lib/utils/strings/transformations";
import { uuid } from "@/lib/utils/uuid";
import { arrowFieldToQueryResultField } from "./arrowFieldToQueryResultField";
import {
  DuckDBColumnSchema,
  DuckDBCSVSniffResult,
  DuckDBLoadCSVResult,
  DuckDBRejectedRow,
  DuckDBScan,
  LoadCSVErrors,
  QueryResultData,
} from "./types";

const MANUAL_BUNDLES: duck.DuckDBBundles = {
  mvp: {
    mainModule: duckDBWasm,
    mainWorker: mvpWorker,
  },
  eh: {
    mainModule: duckDBWasmEh,
    mainWorker: ehWorker,
  },
};

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

function arrowTableToJS<RowObject extends UnknownObject>(
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

class DuckDBClientImpl {
  #db?: Promise<duck.AsyncDuckDB>;
  #conn?: duck.AsyncDuckDBConnection;

  /**
   * Number of unresolved operations. This is used to keep track of how many
   * `withConnection` calls have been made, so that we can know when to
   * actually close a connection.
   */
  #unresolvedOperations: number = 0;

  #logger: ILogger = Logger.appendName("DuckDBClient");

  /** Map csv names to their duckdb table names. */
  #csvTableNameLookup: Record<string, string> = {};

  async #initialize(): Promise<duck.AsyncDuckDB> {
    // Select a bundle based on browser checks
    const bundle = await duck.selectBundle(MANUAL_BUNDLES);

    // Instantiate the asynchronous version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duck.ConsoleLogger();
    const duckdb = new duck.AsyncDuckDB(logger, worker);

    await duckdb.instantiate(bundle.mainModule, bundle.pthreadWorker);
    return duckdb;
  }

  async #getDB(): Promise<duck.AsyncDuckDB> {
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
      db: duck.AsyncDuckDB;
      conn: duck.AsyncDuckDBConnection;
    }) => Promise<T>,
  ): Promise<T> {
    const db = await this.#getDB();
    if (!this.#conn) {
      // if there's no active connection, create a new one
      this.#conn = await db.connect();
    }

    try {
      this.#unresolvedOperations += 1;
      return await operationFn({ db, conn: this.#conn });
    } finally {
      this.#unresolvedOperations -= 1;
      if (this.#unresolvedOperations === 0) {
        // clear the connection
        await this.#conn.close();
        this.#conn = undefined;
      }
    }
  }

  async getTableNames(): Promise<string[]> {
    return await this.#withConnection(async ({ conn }) => {
      // get all table names
      const result = await conn.query(`
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

  async hasLoadedCSV(csvName: string): Promise<boolean> {
    const tableName = snakeify(csvName);
    const tableNames = await this.getTableNames();
    return tableNames.includes(tableName);
  }

  /**
   * Gets the table name for a CSV file.
   * @param csvName The name of the CSV file.
   * @returns The table name.
   */
  getCSVTableName(csvName: string): string {
    const tableName = this.#csvTableNameLookup[csvName];
    if (!tableName) {
      throw new Error(`No table name found for CSV name: ${csvName}`);
    }
    return tableName;
  }

  /**
   * Sniffs a CSV file to infer the CSV column schema and parsing options.
   *
   * This function requires that the CSV file has already been registered
   * with DuckDB.
   *
   * @param csvName The name of the CSV file.
   * @returns The sniffed CSV file information.
   */
  sniffCSV(
    csvName: string,
    options: { numRowsToSkip: number },
  ): Promise<DuckDBCSVSniffResult> {
    return this.#withConnection(async () => {
      const { numRowsToSkip } = options;
      const result = await this.runQuery<DuckDBCSVSniffResult>(
        `SELECT * FROM sniff_csv(
          '$table$', 
          ignore_errors=true, 
          skip=${numRowsToSkip})`,
        { csvName },
      );
      return result.data[0]!;
    });
  }

  /**
   * Loads a CSV file into DuckDB.
   * @param tableName The name of the table to create.
   * @param file The file to load.
   * @returns A promise that resolves when the file is loaded.
   */
  async loadCSV(options: {
    csvName: string;
    file: File;
    numRowsToSkip: number;
  }): Promise<DuckDBLoadCSVResult> {
    const { csvName, file, numRowsToSkip } = options;
    return await this.#withConnection(async ({ db, conn }) => {
      const isCSVAlreadyLoaded = await this.hasLoadedCSV(csvName);

      if (isCSVAlreadyLoaded) {
        // delete the existing table
        await this.runQuery('DROP TABLE IF EXISTS "$table$"', { csvName });

        // clear the existing rejected rows and rejected scans
        // from any previous load attempt
        await this.runQuery(
          `DELETE FROM csv_reject_errors
          USING csv_reject_scans
          WHERE
            csv_reject_errors.file_id = csv_reject_scans.file_id AND
            csv_reject_scans.file_path = '$table$'`,
          { csvName },
        );

        await this.runQuery(
          `DELETE FROM csv_reject_scans
          WHERE csv_reject_scans.file_path = '$table$'`,
          { csvName },
        );
      } else {
        // if the CSV has never been loaded yet, register the file first
        const tableName = snakeify(csvName);

        // store the table name for future lookup
        this.#csvTableNameLookup[csvName] = tableName;
        await db.registerFileHandle(
          tableName,
          file,
          duck.DuckDBDataProtocol.BROWSER_FILEREADER,
          true,
        );
      }

      // now we are ready to start loading the actual CSV data
      // first, we need to sniff the CSV to infer the schema and parsing options
      const sniffResult = await this.sniffCSV(csvName, { numRowsToSkip });

      // insert the CSV file as a table
      await this.runQuery(
        `CREATE TABLE "$table$" AS
            SELECT * ${sniffResult.Prompt.replace(
              "ignore_errors=true",
              `encoding='utf-8',
              store_rejects=true,
              rejects_scan='reject_scans',
              rejects_table='reject_errors',
              rejects_limit=${REJECTED_ROW_STORAGE_LIMIT}`,
            )}`,
        { csvName },
      );

      // append the temporary error tables into permanent tables, so we can
      // keep references to rows that failed to parse
      await conn.query(
        `CREATE TABLE IF NOT EXISTS csv_reject_scans AS
            SELECT * FROM reject_scans
            WHERE 0; -- creates the table with the correct schema, but no rows

          INSERT INTO csv_reject_scans
            SELECT * FROM reject_scans;`,
      );
      await conn.query(
        `CREATE TABLE IF NOT EXISTS csv_reject_errors AS
            SELECT * FROM reject_errors
            WHERE 0; -- creates the table with the correct schema, but no rows

          INSERT INTO csv_reject_errors
            SELECT * FROM reject_errors;`,
      );
      this.#logger.log("Successfully loaded CSV into DuckDB!");

      // now let's collect all information we need to return
      const columns = await this.getCSVSchema(csvName);
      const csvRowCount = await this.getCSVParsedRowCount(csvName);
      const csvErrors = await this.getCSVLoadErrors(csvName);
      return {
        id: uuid(),
        csvName,
        numRows: csvRowCount,
        columns,
        errors: csvErrors,
        numRejectedRows: csvErrors.rejectedRows.length,
        csvSniff: sniffResult,
      };
    });
  }

  /**
   * Gets the number of rows in a CSV file that were successfully parsed.
   * @param csvName The name of the CSV file.
   * @returns The number of successfully-parsed rows.
   */
  async getCSVParsedRowCount(csvName: string): Promise<number> {
    const result = await this.runQuery<{ count: bigint }>(
      `SELECT count(*) as count FROM "$table$"`,
      { csvName },
    );
    return Number(result.data[0]?.count ?? 0);
  }

  /**
   * Gets the schema of a CSV file.
   * @param csvName The name of the CSV file.
   * @returns The schema of the CSV file as an array of
   * DuckDBColumnSchema objects.
   */
  async getCSVSchema(csvName: string): Promise<DuckDBColumnSchema[]> {
    const { data } = await this.runQuery<DuckDBColumnSchema>(
      `DESCRIBE "$table$"`,
      {
        csvName,
      },
    );
    return data;
  }

  getCSVLoadErrors(csvName: string): Promise<LoadCSVErrors> {
    const tableName = this.getCSVTableName(csvName);
    return this.#withConnection(async () => {
      try {
        const rejectedScansResult = await this.runQuery<DuckDBScan>(
          `SELECT * FROM csv_reject_scans WHERE file_path='${tableName}'`,
        );
        const { data: rejectedScans } = rejectedScansResult;
        if (isNonEmptyArray(rejectedScans)) {
          // if there are scans, then let's see if there are any rejected rows
          const fileId = rejectedScans[0].file_id;
          const rejectedRows = await this.runQuery<DuckDBRejectedRow>(
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
    });
  }

  /**
   * Runs a query against the database.
   * @param queryString The query to run.
   * @returns The results of the query.
   */
  async runQuery<RowObject extends UnknownObject = UnknownObject>(
    queryString: string,
    options?: {
      csvName?: string;
    },
  ): Promise<QueryResultData<RowObject>> {
    return await this.#withConnection(async ({ conn }) => {
      try {
        let queryStringToUse = queryString;
        if (options?.csvName) {
          // replace $table$ with the actual table name
          const tableName = this.getCSVTableName(options.csvName);
          queryStringToUse = queryString.replace(/\$table\$/g, tableName);
        }

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
}

export const DuckDBClient = new DuckDBClientImpl();
