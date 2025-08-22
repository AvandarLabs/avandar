import * as duckdb from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import * as arrow from "apache-arrow";
import { ILogger, Logger } from "@/lib/Logger";
import { MIMEType } from "@/lib/types/common";
import { isNonEmptyArray } from "@/lib/utils/guards";
import { mapObjectValues } from "@/lib/utils/objects/transformations";
import { snakeify } from "@/lib/utils/strings/transformations";
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
} from "./types";

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

function arrowTableToJS<RowObject extends Record<string, unknown>>(
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
  #db?: Promise<duckdb.AsyncDuckDB>;
  #conn?: duckdb.AsyncDuckDBConnection;

  /**
   * Number of unresolved operations. This is used to keep track of how many
   * `withConnection` calls have been made, so that we can know when to
   * actually close a connection.
   */
  #unresolvedOperations: number = 0;

  #logger: ILogger = Logger.appendName("DuckDBClient");

  /** Map csv names to their duckdb table names. */
  #csvTableNameLookup: Record<string, string> = {};

  async #initialize(): Promise<duckdb.AsyncDuckDB> {
    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

    // Instantiate the asynchronous version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);

    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    // drop the whole database for now and then we can restart it
    const rootOPFS = await navigator.storage.getDirectory();
    const fileHandle = await rootOPFS.getFileHandle("avandar.duckdb");
    await fileHandle.remove();

    // TODO(jpsyx): if we are in a browser that does not support OPFS
    // we will need to persist to indexedDB. we should handle this.
    await db.open({
      path: `opfs://avandar.duckdb`,
      accessMode: duckdb.DuckDBAccessMode.AUTOMATIC,
    });

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

  async #registerCSVFile(options: { name: string; file: File }): Promise<void> {
    const { name, file } = options;
    const tableName = snakeify(options.name);

    // store the table name for future lookup
    this.#csvTableNameLookup[name] = tableName;

    const db = await this.#getDB();
    await db.registerFileHandle(
      tableName,
      file,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true,
    );
  }

  async #registerParquetFile(options: {
    name: string;
    blob: Blob;
  }): Promise<void> {
    const { name, blob } = options;
    if (blob.type !== MIMEType.APPLICATION_PARQUET) {
      throw new Error("Blob is not a parquet file");
    }

    const tableName = snakeify(options.name);

    // store the table name for future lookup
    this.#csvTableNameLookup[name] = tableName;

    // convert the blob to a Uint8Array
    const parquetBuffer = new Uint8Array(await blob.arrayBuffer());
    const db = await this.#getDB();
    await db.registerFileBuffer(tableName, parquetBuffer);
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
  async sniffCSV(
    csvName: string,
    options: { numRowsToSkip?: number; delimiter?: string },
  ): Promise<DuckDBCSVSniffResult> {
    const { delimiter, numRowsToSkip } = options;
    const hasUserProvidedOptions = !!numRowsToSkip || !!delimiter;
    const result = await this.runQuery<DuckDBCSVSniffResult>(
      `SELECT * FROM sniff_csv(
          '$table$', 
          strict_mode=${hasUserProvidedOptions ? "true" : "false"},
          ignore_errors=true
          ${numRowsToSkip ? `, skip=${numRowsToSkip}` : ""}
          ${delimiter ? `, delim='${delimiter}'` : ""}
      )`,
      { csvName },
    );
    return result.data[0]!;
  }

  /**
   * Drops a file from DuckDB's internal file system. Also drops all
   * tables and information about rejected scans and rejected rows
   * that are associated with the file.
   * @param csvName The name of the CSV file to drop.
   */
  async #dropCSVFile(csvName: string): Promise<void> {
    const db = await this.#getDB();

    // delete the table associated to this file
    await this.runQuery('DROP TABLE IF EXISTS "$table$"', { csvName });

    // clear the existing rejected rows and rejected scans
    // from any previous load attempts
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

    // finally, drop the file from DuckDB's internal file system
    await db.dropFile(csvName);
    delete this.#csvTableNameLookup[csvName];
  }

  /**
   * Renames a CSV file. This does not change the internal DuckDB table name,
   * it only changes the CSV name we will use to reference it. The internal
   * DuckDB table name should not matter to the user, because this class
   * interface only ever exposes the CSV name to the user.
   */
  renameCSV(options: { oldName: string; newName: string }): void {
    this.#csvTableNameLookup[options.newName] =
      this.#csvTableNameLookup[options.oldName]!;
    delete this.#csvTableNameLookup[options.oldName];
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
    numRowsToSkip?: number;
    delimiter?: string;
  }): Promise<DuckDBLoadCSVResult> {
    const { csvName, file, numRowsToSkip, delimiter } = options;
    return await this.#withConnection(async ({ conn }) => {
      const isCSVAlreadyLoaded = await this.hasLoadedCSV(csvName);
      if (isCSVAlreadyLoaded) {
        await this.#dropCSVFile(csvName);
      }

      await this.#registerCSVFile({ name: csvName, file });

      // now we are ready to start loading the actual CSV data
      // first, we need to sniff the CSV to infer the schema and parsing options
      const sniffResult = await this.sniffCSV(csvName, {
        numRowsToSkip,
        delimiter,
      });

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

  async loadParquet(options: {
    name: string;
    blob: Blob;
    overwrite?: boolean;
  }): Promise<DuckDBLoadParquetResult> {
    const { name, blob, overwrite } = options;
    return await this.#withConnection(async () => {
      const isCSVAlreadyLoaded = await this.hasLoadedCSV(name);
      if (isCSVAlreadyLoaded && overwrite) {
        await this.#dropCSVFile(name);
      }

      if (!isCSVAlreadyLoaded || overwrite) {
        await this.#registerParquetFile({ name, blob });
      }

      // reingest the parquet data into a table if it doesn't
      // already exist
      await this.runQuery(
        `CREATE TABLE IF NOT EXISTS "$table$" AS
            SELECT * FROM read_parquet('$table$')`,
        { csvName: name },
      );

      // now let's collect all information we need to return
      const columns = await this.getCSVSchema(name);
      const csvRowCount = await this.getCSVParsedRowCount(name);

      return {
        name,
        columns,
        id: uuid(),
        numRows: csvRowCount,
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

  async getCSVLoadErrors(csvName: string): Promise<LoadCSVErrors> {
    const tableName = this.getCSVTableName(csvName);
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
  }

  async exportCSVAsParquet(csvName: string): Promise<Blob> {
    const db = await this.#getDB();
    const parquetFileName = `${this.getCSVTableName(csvName)}.parquet`;

    // create the parquet file in the DuckDB internal file system
    await this.runQuery(
      `COPY '$table$' TO '${parquetFileName}' (FORMAT parquet)`,
      { csvName },
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
   * @param queryString The query to run.
   * @returns The results of the query.
   */
  async runQuery<
    RowObject extends Record<string, unknown> = Record<string, unknown>,
  >(
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
