import { uuid } from "$/lib/uuid";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { registerParquetFile } from "@/clients/DuckDbClient/duckDbFileRegistry";
import {
  getParquetProjectionClauses,
  getRowNumberedViewName,
} from "@/clients/DuckDbClient/duckDbSqlText";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbLoadParquetResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type {
  DuckDbClientOperations,
  DuckDbLoadParquetOptions,
} from "@/clients/DuckDbClient/duckDbClientOperations";
import type * as duckdb from "@duckdb/duckdb-wasm";

async function _createParquetView(
  options: Readonly<{
    client: DuckDbClientOperations;
    conn: duckdb.AsyncDuckDBConnection;
    datasetDuckDbLease: DatasetDuckDbLease;
    excludeClause: string;
    replaceClause: string;
    tableName: string;
  }>,
): Promise<void> {
  await options.conn.query("SET enable_external_file_cache = false");
  try {
    await options.client.runRawQuery(
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

/**
 * Creates the auxiliary view that exposes the parquet file's physical row
 * order, beside the dataset's public view and over the same registered file.
 *
 * It carries the same projection as the public view so column names agree, plus
 * `file_row_number`, which `SELECT *` picks up automatically once
 * `file_row_number = true` is set. Dropped in `loadParquetIntoDuckDb` alongside
 * the public view, so the two never outlive each other.
 */
async function _createRowNumberedView(
  options: Readonly<{
    client: DuckDbClientOperations;
    conn: duckdb.AsyncDuckDBConnection;
    datasetDuckDbLease: DatasetDuckDbLease;
    excludeClause: string;
    replaceClause: string;
    tableName: string;
  }>,
): Promise<void> {
  await options.client.runRawQuery(
    `CREATE VIEW IF NOT EXISTS "$viewName$" AS
    SELECT * $excludeClause$ $replaceClause$
    FROM read_parquet("$tableName$", file_row_number = true)`,
    {
      conn: options.conn,
      datasetDuckDbLease: options.datasetDuckDbLease,
      [TRUSTED_INTERNAL_SQL]: true,
      params: {
        viewName: getRowNumberedViewName(options.tableName),
        tableName: options.tableName,
        replaceClause: options.replaceClause,
        excludeClause: options.excludeClause,
      },
    },
  );
}

/**
 * Drops the auxiliary row-numbered view.
 *
 * Deliberately a plain `DROP VIEW`, not `client.dropTableViewAndFile`: that
 * helper treats its argument as a dataset id when it takes the coordinator
 * lease, and an `ava_rows_` name is not one. There is also no registered file
 * of its own to drop, because it reads the dataset's file.
 *
 * KNOWN GAP, deliberate: this load path is the view's only lifecycle owner, so
 * a dataset dropped through `dropTableViewAndFile` and never reloaded leaves an
 * orphan view over a dropped file. Adding the drop to that shared helper was
 * tried and reverted: it changed the drop sequence every dataset drop goes
 * through and broke four leasing tests, which is too much risk for an orphan
 * that only fails if something queries it, and only the concept view ever
 * names one. Fix it with the spine caching work, which needs this lifecycle
 * anyway.
 */
async function _dropRowNumberedView(
  options: Readonly<{
    client: DuckDbClientOperations;
    conn: duckdb.AsyncDuckDBConnection;
    datasetDuckDbLease: DatasetDuckDbLease;
    tableName: string;
  }>,
): Promise<void> {
  await options.client.runRawQuery(`DROP VIEW IF EXISTS "$viewName$"`, {
    conn: options.conn,
    datasetDuckDbLease: options.datasetDuckDbLease,
    [TRUSTED_INTERNAL_SQL]: true,
    params: { viewName: getRowNumberedViewName(options.tableName) },
  });
}

async function _getParquetLoadResult(
  options: Readonly<{
    client: DuckDbClientOperations;
    tableName: string;
    datasetDuckDbLease: DatasetDuckDbLease;
  }>,
): Promise<DuckDbLoadParquetResult> {
  DatasetDuckDbCoordinator.markDatasetDuckDbTableValidForWorkspace(
    options.tableName,
  );
  const [columns, rowCount] = await Promise.all([
    options.client.getTableSchema(options),
    options.client.getTableRowCount(options),
  ]);
  return {
    name: options.tableName,
    columns,
    id: uuid(),
    numRows: rowCount,
  };
}

/**
 * Registers a parquet blob and exposes it as the dataset's bare DuckDB view.
 *
 * The caller must already hold the dataset's DuckDB lease.
 */
export async function loadParquetIntoDuckDb(
  options: Readonly<
    DuckDbLoadParquetOptions & {
      client: DuckDbClientOperations;
      datasetDuckDbLease: DatasetDuckDbLease;
    }
  >,
): Promise<DuckDbLoadParquetResult> {
  const { client, tableName, blob, columnReplacements } = options;
  await client.dropTableViewAndFile({
    tableOrViewName: tableName,
    datasetDuckDbLease: options.datasetDuckDbLease,
  });
  const db = await client.getDb();
  await registerParquetFile({ db, tableName, blob });

  const conn = await client.connect();
  try {
    const projectionClauses = getParquetProjectionClauses(columnReplacements);
    await _createParquetView({
      client,
      conn,
      datasetDuckDbLease: options.datasetDuckDbLease,
      tableName,
      ...projectionClauses,
    });
    // The row-numbered view is recreated with the public view rather than left
    // behind, so a reloaded dataset can never be ordered by a stale row order.
    await _dropRowNumberedView({
      client,
      conn,
      datasetDuckDbLease: options.datasetDuckDbLease,
      tableName,
    });
    await _createRowNumberedView({
      client,
      conn,
      datasetDuckDbLease: options.datasetDuckDbLease,
      tableName,
      ...projectionClauses,
    });
    return await _getParquetLoadResult({
      client,
      tableName,
      datasetDuckDbLease: options.datasetDuckDbLease,
    });
  } finally {
    await client.closeConnection(conn);
  }
}
