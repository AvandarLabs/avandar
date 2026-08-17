import { uuid } from "$/lib/uuid";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { registerParquetFile } from "@/clients/DuckDbClient/duckDbFileRegistry";
import { getParquetProjectionClauses } from "@/clients/DuckDbClient/duckDbSqlText";
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
    await _createParquetView({
      client,
      conn,
      datasetDuckDbLease: options.datasetDuckDbLease,
      tableName,
      ...getParquetProjectionClauses(columnReplacements),
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
