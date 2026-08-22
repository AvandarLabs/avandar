import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type {
  DatasetDuckDbLease,
  PublicSnapshotDuckDbOwner,
} from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type {
  DuckDbColumnSchema,
  DuckDbLoadParquetResult,
  DuckDbStructuredQuery,
  UnknownRow,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { ILogger } from "@avandar/logger";
import type * as duckdb from "@duckdb/duckdb-wasm";

/**
 * Marks SQL that this module built itself, so the fail-closed analyzer may
 * accept a source it cannot inspect. Never set this for caller-supplied SQL.
 */
export const TRUSTED_INTERNAL_SQL: unique symbol = Symbol(
  "TRUSTED_INTERNAL_SQL",
);

/** Options accepted by `DuckDbClient.runRawQuery`. */
export type RawQueryOptions = {
  params?: Record<string, string | number | bigint | undefined>;
  returnType?: "parquet" | "js";
  conn?: duckdb.AsyncDuckDBConnection;
  datasetDuckDbLease?: DatasetDuckDbLease;
  datasetTableReadMode?: "public" | "workspace";
  publicSnapshotDuckDbOwner?: PublicSnapshotDuckDbOwner;
  signal?: AbortSignal;
  [TRUSTED_INTERNAL_SQL]?: true;
};

/** The overloaded shape of `DuckDbClient.runRawQuery`. */
export type DuckDbRunRawQuery = {
  <RowObject extends UnknownRow = UnknownRow>(
    queryString: string,
    options?: RawQueryOptions & { returnType?: "js" },
  ): Promise<QueryResult.T<RowObject>>;
  (
    queryString: string,
    options?: RawQueryOptions & { returnType: "parquet" },
  ): Promise<Blob>;
};

/** Options for loading a parquet blob as a bare DuckDB table. */
export type DuckDbLoadParquetOptions = {
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

/**
 * The client operations that extracted DuckDB units call back into.
 *
 * The client builds this fresh for every call so that a test double installed
 * on the client instance is picked up rather than an earlier bound method.
 */
export type DuckDbClientOperations = {
  closeConnection: (conn: duckdb.AsyncDuckDBConnection) => Promise<void>;
  connect: () => Promise<duckdb.AsyncDuckDBConnection>;
  dropTableViewAndFile: (
    options: Readonly<{
      tableOrViewName: string;
      datasetDuckDbLease?: DatasetDuckDbLease;
    }>,
  ) => Promise<void>;
  exportTableAsParquet: (
    tableOrViewName: string,
    conn?: duckdb.AsyncDuckDBConnection,
  ) => Promise<Blob>;
  getDb: () => Promise<duckdb.AsyncDuckDB>;
  getTableRowCount: (
    options: Readonly<{
      tableName: string;
      datasetDuckDbLease?: DatasetDuckDbLease;
    }>,
  ) => Promise<number>;
  getTableSchema: (
    options: Readonly<{
      tableName: string;
      datasetDuckDbLease?: DatasetDuckDbLease;
    }>,
  ) => Promise<DuckDbColumnSchema[]>;
  loadParquet: (
    options: Readonly<DuckDbLoadParquetOptions>,
  ) => Promise<DuckDbLoadParquetResult>;
  logger: ILogger;
  runRawQuery: DuckDbRunRawQuery;
  runStructuredQuery: <RowObject extends UnknownRow>(
    options: Readonly<DuckDbStructuredQuery>,
  ) => Promise<QueryResult.T<RowObject>>;
};
