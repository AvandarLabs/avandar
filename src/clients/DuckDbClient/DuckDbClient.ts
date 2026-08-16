import { sniffCsvFile } from "@/clients/DuckDbClient/csvParse/sniffCsvFile";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { makeDuckDbConnectionManager } from "@/clients/DuckDbClient/duckDbConnectionManager";
import { loadCsvIntoDuckDb } from "@/clients/DuckDbClient/duckDbCsvLoad";
import { loadParquetIntoDuckDb } from "@/clients/DuckDbClient/duckDbParquetLoad";
import {
  forEachDuckDbQueryPage,
  getDuckDbQueryPage,
} from "@/clients/DuckDbClient/duckDbQueryPaging";
import {
  exportDuckDbTableAsParquet,
  runDuckDbRawQuery,
} from "@/clients/DuckDbClient/duckDbRawQuery";
import { runLeasedDuckDbStructuredQuery } from "@/clients/DuckDbClient/duckDbStructuredQuery";
import {
  dropDuckDbTableViewAndFile,
  getDuckDbRelationNames,
} from "@/clients/DuckDbClient/duckDbTableIntrospection";
import { loadXlsxIntoDuckDb } from "@/clients/DuckDbClient/duckDbXlsxLoad";
import { Logger } from "@/utils/Logger";
import type { SniffCsvOptions } from "@/clients/DuckDbClient/csvParse/sniffCsvFile";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type {
  DuckDbColumnSchema,
  DuckDbCsvSniffResult,
  DuckDbLoadCsvResult,
  DuckDbLoadParquetResult,
  DuckDbLoadXlsxResult,
  DuckDbStructuredQuery,
  UnknownRow,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type {
  DuckDbClientOperations,
  DuckDbLoadParquetOptions,
  RawQueryOptions,
} from "@/clients/DuckDbClient/duckDbClientOperations";
import type { DuckDbLoadCsvOptions } from "@/clients/DuckDbClient/duckDbCsvLoad";
import type { DuckDbLoadXlsxOptions } from "@/clients/DuckDbClient/duckDbXlsxLoad";
import type { ILogger } from "@avandar/logger";
import type * as duckdb from "@duckdb/duckdb-wasm";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

export type { DuckDbLoadCsvOptions } from "@/clients/DuckDbClient/duckDbCsvLoad";
export type { DuckDbLoadXlsxOptions } from "@/clients/DuckDbClient/duckDbXlsxLoad";
export type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient.types";

const duckDbLogger: ILogger = Logger.appendName("DuckDbClient");

/**
 * A DuckDB client.
 *
 * TODO(jpsyx): convert this to a composable function rather than a class.
 */
class DuckDbClientImpl {
  #connections = makeDuckDbConnectionManager(duckDbLogger);

  #logger: ILogger = duckDbLogger;

  /**
   * Builds the operation bundle that extracted units call back into. It is
   * rebuilt per call so a test double installed on this instance is used
   * rather than a method bound at construction time.
   */
  #getOperations(): DuckDbClientOperations {
    return {
      closeConnection: this.#connections.closeConnection,
      connect: this.#connections.connect,
      dropTableViewAndFile: this.dropTableViewAndFile.bind(this),
      exportTableAsParquet: this.exportTableAsParquet.bind(this),
      getDb: this.#connections.getDb,
      getTableRowCount: this.getTableRowCount.bind(this),
      getTableSchema: this.getTableSchema.bind(this),
      loadParquet: this.loadParquet.bind(this),
      logger: this.#logger,
      runRawQuery: this.runRawQuery.bind(this),
      runStructuredQuery: this.runStructuredQuery.bind(this),
    };
  }

  /**
   * Runs `callback` on a single DuckDB connection so temp views and tables
   * created in one statement remain visible to the next.
   */
  async withConnection<T>(
    callback: (conn: duckdb.AsyncDuckDBConnection) => Promise<T>,
  ): Promise<T> {
    const conn = await this.#connections.connect();
    try {
      return await callback(conn);
    } finally {
      await this.#connections.closeConnection(conn);
    }
  }

  async getTableNames(): Promise<string[]> {
    return await getDuckDbRelationNames({
      client: this.#getOperations(),
      tableType: "BASE TABLE",
    });
  }

  async getViewNames(): Promise<string[]> {
    return await getDuckDbRelationNames({
      client: this.#getOperations(),
      tableType: "VIEW",
    });
  }

  async hasTable(tableName: string): Promise<boolean> {
    const dbTableNames = await this.getTableNames();
    return dbTableNames.includes(tableName);
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
   * Gets the number of rows in a table.
   * @param options.tableName The table to count.
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
   * @param options.tableName The name of the table.
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

  /**
   * Drops a file from DuckDB's internal file system and any tables related
   * to it. If the `tableOrViewName` does not exist, this will do nothing. It
   * does not throw an error.
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
        await dropDuckDbTableViewAndFile({
          client: this.#getOperations(),
          datasetDuckDbLease,
          hasTable: this.hasTable.bind(this),
          hasView: this.hasView.bind(this),
          tableOrViewName,
        });
      },
    });
  }

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
    return await sniffCsvFile({ ...options, client: this.#getOperations() });
  }

  /** Loads a CSV while holding its bare table's dataset lease. */
  async loadCsv(
    options: Readonly<DuckDbLoadCsvOptions>,
  ): Promise<DuckDbLoadCsvResult> {
    return await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [options.tableName],
      lease: options.datasetDuckDbLease,
      operation: async (datasetDuckDbLease) => {
        return await loadCsvIntoDuckDb({
          ...options,
          client: this.#getOperations(),
          datasetDuckDbLease,
        });
      },
    });
  }

  /** Loads an XLSX file while holding its bare table's dataset lease. */
  async loadXlsx(
    options: Readonly<DuckDbLoadXlsxOptions>,
  ): Promise<DuckDbLoadXlsxResult> {
    return await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [options.tableName],
      lease: options.datasetDuckDbLease,
      operation: async (datasetDuckDbLease) => {
        return await loadXlsxIntoDuckDb({
          ...options,
          client: this.#getOperations(),
          datasetDuckDbLease,
        });
      },
    });
  }

  /** Loads a parquet file while holding its bare table's dataset lease. */
  async loadParquet(
    options: Readonly<DuckDbLoadParquetOptions>,
  ): Promise<DuckDbLoadParquetResult> {
    return await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [options.tableName],
      lease: options.datasetDuckDbLease,
      operation: async (datasetDuckDbLease) => {
        return await loadParquetIntoDuckDb({
          ...options,
          client: this.#getOperations(),
          datasetDuckDbLease,
        });
      },
    });
  }

  /**
   * Exports a table or view as a Parquet file using ZSTD compression
   * (default). "Exporting" means that we turn it into a blob.
   *
   * @param tableOrViewName The name of the table or view to export as a
   * Parquet blob.
   * @param conn An existing connection to reuse, if any.
   */
  async exportTableAsParquet(
    tableOrViewName: string,
    conn?: duckdb.AsyncDuckDBConnection,
  ): Promise<Blob> {
    return await exportDuckDbTableAsParquet({
      client: this.#getOperations(),
      conn,
      tableOrViewName,
    });
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
    return await runDuckDbRawQuery<RowObject>({
      client: this.#getOperations(),
      options,
      queryString,
    });
  }

  async getPage<T extends UnknownRow>(
    options: Omit<
      DuckDbStructuredQuery & { pageSize: number; pageNum: number },
      "limit" | "offset"
    >,
  ): Promise<QueryResult.Page<T>> {
    return await getDuckDbQueryPage<T>(this.#getOperations(), options);
  }

  async forEachQueryPage<T extends UnknownRow>(
    options: Readonly<{
      query: Omit<DuckDbStructuredQuery, "limit" | "offset"> & {
        pageSize?: number;
      };
      callback: (page: QueryResult.Page<T>) => void | Promise<void>;
    }>,
  ): Promise<{ numPages: number; numRows: number }> {
    return await forEachDuckDbQueryPage<T>({
      ...options,
      client: this.#getOperations(),
    });
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
        return await runLeasedDuckDbStructuredQuery<RowObject>({
          client: this.#getOperations(),
          datasetDuckDbLease,
          structuredQuery: options,
        });
      },
    });
  }
}

export const DuckDbClient = new DuckDbClientImpl();
