import * as duckdb from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import { invariant } from "@tanstack/react-router";
import * as arrow from "apache-arrow";
import knex from "knex";
import { match } from "ts-pattern";
import { ILogger, Logger } from "@/lib/Logger";
import { MIMEType } from "@/lib/types/common";
import { isNonEmptyArray } from "@/lib/utils/guards";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries } from "@/lib/utils/objects/misc";
import {
  camelCaseKeysShallow,
  mapObjectValues,
} from "@/lib/utils/objects/transformations";
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
  StructuredQueryConfig,
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

type UnknownRow = Record<string, unknown>;

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
    await db.open({
      path: `opfs://avandar.duckdb`,
      accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
    });

    // create a table that tracks dataset names mapped to their table names
    await this.runRawQuery(
      `CREATE TABLE IF NOT EXISTS datasets (
        dataset_name VARCHAR UNIQUE,
        table_name VARCHAR UNIQUE
      )`,
    );
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
        // clear the connection
        await this.#conn.close();
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
   * Checks if a dataset file has been loaded into DuckDB. This requires that
   * both the dataset name be in the `datasets` table and the table name be in
   * the list of table names.
   * @param datasetName The name of the CSV file.
   * @returns A promise that resolves to a boolean indicating whether the CSV
   * file has been loaded.
   */
  async hasLoadedDataset(datasetName: string): Promise<boolean> {
    const datasetResults = await this.runRawQuery<{
      dataset_name: string;
      table_name: string;
    }>(
      `SELECT dataset_name, table_name FROM datasets
        WHERE dataset_name = '${datasetName}'`,
    );
    if (datasetResults.numRows === 0) {
      return false;
    }
    invariant(datasetResults.numRows === 1, "Expected exactly one dataset");
    const tableName = datasetResults.data[0]!.table_name;
    return await this.hasTable(tableName);
  }

  async #addDatasetMapping(datasetName: string): Promise<void> {
    const tableName = snakeify(datasetName);
    await this.#withConnection(async ({ conn }) => {
      await conn.query(
        `INSERT INTO datasets (dataset_name, table_name)
          VALUES ('${datasetName}', '${tableName}')
          ON CONFLICT DO NOTHING`,
      );
      await this.syncDB();
      Logger.log("new dataset list", await this.getLocalDatasetList());
    });
  }

  async #registerDatasetFromCSV(
    options: { name: string; file: File } | { name: string; fileText: string },
  ): Promise<void> {
    const { name } = options;
    await this.#withConnection(async ({ db }) => {
      await this.#addDatasetMapping(name);
      const tableName = await this.#getDatasetTableName(name);

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

  async #registerDatasetFromParquet(options: {
    name: string;
    blob: Blob;
  }): Promise<void> {
    const { name, blob } = options;
    if (blob.type !== MIMEType.APPLICATION_PARQUET) {
      throw new Error("Blob is not a parquet file");
    }
    await this.#addDatasetMapping(name);
    const db = await this.#getDB();
    const tableName = await this.#getDatasetTableName(name);

    // convert the blob to a Uint8Array
    const parquetBuffer = new Uint8Array(await blob.arrayBuffer());
    await db.registerFileBuffer(tableName, parquetBuffer);
  }

  /**
   * Gets the table name for a dataset.
   * @param datasetName The name of the dataset.
   * @returns The table name.
   */
  async #getDatasetTableName(datasetName: string): Promise<string> {
    const tableName = await this.runRawQuery<{ table_name: string }>(
      `SELECT table_name FROM datasets WHERE dataset_name = '${datasetName}'`,
    );
    Logger.log("all datasets", await this.getLocalDatasetList());
    if (tableName.numRows === 0) {
      throw new Error(
        `No table name found for dataset with name '${datasetName}'`,
      );
    }
    invariant(tableName.numRows === 1, "Expected exactly one table name");
    return tableName.data[0]!.table_name;
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
    const result = await this.runRawQuery<DuckDBCSVSniffResult>(
      `SELECT * FROM sniff_csv(
          '$tableName$', 
          strict_mode=${hasUserProvidedOptions ? "true" : "false"},
          ignore_errors=true
          ${numRowsToSkip ? `, skip=${numRowsToSkip}` : ""}
          ${delimiter ? `, delim='${delimiter}'` : ""}
      )`,
      { datasetName: csvName },
    );
    return result.data[0]!;
  }

  /**
   * Drops a file from DuckDB's internal file system. Also drops all
   * tables and information about rejected scans and rejected rows
   * that are associated with the file.
   * @param datasetName The name of the CSV file to drop.
   */
  async dropDataset(datasetName: string): Promise<void> {
    const db = await this.#getDB();
    const tableName = await this.#getDatasetTableName(datasetName);

    // delete the table associated to this file
    await this.runRawQuery('DROP TABLE IF EXISTS "$tableName$"', {
      datasetName,
    });

    const dbTableNames = await this.getTableNames();
    if (dbTableNames.includes("csv_reject_errors")) {
      // clear rejected rows from previous load attempts
      await this.runRawQuery(
        `DELETE FROM csv_reject_errors
          USING csv_reject_scans
          WHERE
            csv_reject_errors.file_id = csv_reject_scans.file_id AND
            csv_reject_scans.file_path = '$tableName$';`,
        { datasetName },
      );
    }

    if (dbTableNames.includes("csv_reject_scans")) {
      // clear rejected scans from previous load attempts
      await this.runRawQuery(
        `DELETE FROM csv_reject_scans
            WHERE csv_reject_scans.file_path = '$tableName$';`,
        { datasetName },
      );
    }

    // finally, delete the dataset-to-tableName mapping for this dataset
    await this.runRawQuery(
      `DELETE FROM datasets WHERE dataset_name = '$datasetName$';`,
      { datasetName },
    );

    // finally, drop the file from DuckDB's internal file system
    await db.dropFile(tableName);
    await this.syncDB();
  }

  async getLocalDatasetList(): Promise<
    Array<{ datasetName: string; tableName: string }>
  > {
    const datasets = await this.runRawQuery<{
      dataset_name: string;
      table_name: string;
    }>(`SELECT dataset_name, table_name FROM datasets`);
    return datasets.data.map(camelCaseKeysShallow);
  }

  /**
   * Syncs the DuckDB database with the browser's OPFS file system.
   */
  async syncDB(): Promise<void> {
    await this.#withConnection(async ({ conn }) => {
      await conn.query("CHECKPOINT");
    });
  }

  /**
   * Renames a dataset. This does not change the internal DuckDB table name,
   * it only changes the mapping so that this new dataset name can point to the
   * table name. The internal DuckDB table name should not matter to the user,
   * because the user only ever uses the dataset name to interact with this
   * interface.
   */
  async renameDataset(options: {
    oldName: string;
    newName: string;
  }): Promise<void> {
    await this.#withConnection(async ({ conn }) => {
      await conn.query(
        `UPDATE datasets SET dataset_name = '${options.newName}'
          WHERE dataset_name = '${options.oldName}';`,
      );
      await this.syncDB();
    });
  }

  /**
   * Loads a CSV file into DuckDB.
   * @param tableName The name of the table to create.
   * @param file The file to load.
   * @returns A promise that resolves when the file is loaded.
   */
  async loadCSV(
    options: {
      csvName: string;
      numRowsToSkip?: number;
      delimiter?: string;
    } & ({ file: File } | { fileText: string }),
  ): Promise<DuckDBLoadCSVResult> {
    const { csvName, numRowsToSkip, delimiter } = options;

    return await this.#withConnection(async ({ conn }) => {
      const isDatasetAlreadyLoaded = await this.hasLoadedDataset(csvName);
      if (isDatasetAlreadyLoaded) {
        // if the dataset already exists, we drop it and then recreate it.
        // For now, CSV loading will ALWAYS overwrite the existing data
        await this.dropDataset(csvName);
      }

      await this.#registerDatasetFromCSV(
        "file" in options ?
          { name: csvName, file: options.file }
        : { name: csvName, fileText: options.fileText },
      );

      // now we are ready to start loading the actual CSV data
      // first, we need to sniff the CSV to infer the schema and parsing options
      const sniffResult = await this.sniffCSV(csvName, {
        numRowsToSkip,
        delimiter,
      });

      // insert the CSV file as a table
      await this.runRawQuery(
        `CREATE TABLE "$tableName$" AS
            SELECT * ${sniffResult.Prompt.replace(
              "ignore_errors=true",
              `encoding='utf-8',
              store_rejects=true,
              rejects_scan='reject_scans',
              rejects_table='reject_errors',
              rejects_limit=${REJECTED_ROW_STORAGE_LIMIT}`,
            )}`,
        { datasetName: csvName },
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

      await this.syncDB();

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
    /**
     * Overwrite the existing dataset if it exists. Otherwise, we skip
     * parsing the dataset, and just return the existing metadata.
     */
    overwrite?: boolean;
  }): Promise<DuckDBLoadParquetResult> {
    const { name, blob, overwrite } = options;
    return await this.#withConnection(async () => {
      const isDatasetAlreadyLoaded = await this.hasLoadedDataset(name);
      if (isDatasetAlreadyLoaded && overwrite) {
        await this.dropDataset(name);
      }

      if (!isDatasetAlreadyLoaded || overwrite) {
        await this.#registerDatasetFromParquet({ name, blob });
      }

      // reingest the parquet data into a table if it doesn't
      // already exist
      await this.runRawQuery(
        `CREATE TABLE IF NOT EXISTS "$tableName$" AS
            SELECT * FROM read_parquet('$tableName$')`,
        { datasetName: name },
      );

      // now let's collect all information we need to return
      const columns = await this.getCSVSchema(name);
      const csvRowCount = await this.getCSVParsedRowCount(name);

      await this.syncDB();
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
    const result = await this.runRawQuery<{ count: bigint }>(
      `SELECT count(*) as count FROM "$tableName$"`,
      { datasetName: csvName },
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
    const { data } = await this.runRawQuery<DuckDBColumnSchema>(
      `DESCRIBE "$tableName$"`,
      { datasetName: csvName },
    );
    return data;
  }

  async getCSVLoadErrors(csvName: string): Promise<LoadCSVErrors> {
    try {
      const rejectedScansResult = await this.runRawQuery<DuckDBScan>(
        `SELECT * FROM csv_reject_scans WHERE file_path='$tableName$'`,
        { datasetName: csvName },
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
      this.#logger.error(error, { csvName });
      throw error;
    }
  }

  async exportCSVAsParquet(csvName: string): Promise<Blob> {
    const db = await this.#getDB();
    const parquetFileName = `${this.#getDatasetTableName(csvName)}.parquet`;

    // create the parquet file in the DuckDB internal file system
    await this.runRawQuery(
      `COPY '$tableName$' TO '${parquetFileName}' (FORMAT parquet)`,
      { datasetName: csvName },
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
  async runRawQuery<RowObject extends UnknownRow = UnknownRow>(
    queryString: string,
    options?: {
      datasetName?: string;
    },
  ): Promise<QueryResultData<RowObject>> {
    return await this.#withConnection(async ({ conn }) => {
      try {
        let queryStringToUse = queryString;
        if (options?.datasetName) {
          // replace $tableName$ with the actual table name
          const tableName = await this.#getDatasetTableName(
            options.datasetName,
          );
          queryStringToUse = queryString
            .replace(/\$tableName\$/g, tableName)
            .replace(/\$datasetName\$/g, options.datasetName);
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

  async runStructuredQuery({
    selectFields,
    groupByFields,
    aggregations,
    datasetId,
    orderByColumn,
    orderByDirection,
  }: StructuredQueryConfig): Promise<QueryResultData<UnknownRow>> {
    const selectFieldNames = selectFields.map(getProp("name"));
    const groupByFieldNames = groupByFields.map(getProp("name"));
    const tableName = await this.#getDatasetTableName(datasetId);

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
}

export const DuckDBClient = new DuckDBClientImpl();
