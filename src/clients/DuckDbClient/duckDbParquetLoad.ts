import { promiseMapSequential } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { uuid } from "$/lib/uuid";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { registerParquetFile } from "@/clients/DuckDbClient/duckDbFileRegistry";
import {
  getKeptEnumValuesQueries,
  getParquetProjectionClauses,
  getRawValuesViewName,
  getRowNumberedViewName,
} from "@/clients/DuckDbClient/duckDbSqlText";
import { getLoadedDuckDbTableShape } from "@/clients/DuckDbClient/duckDbTableIntrospection";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbLoadParquetResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type {
  DuckDbClientOperations,
  DuckDbLoadParquetOptions,
} from "@/clients/DuckDbClient/duckDbClientOperations";
import type * as duckdb from "@duckdb/duckdb-wasm";

/** What every statement of one load runs with. */
type ViewLoadContext = Readonly<{
  client: DuckDbClientOperations;
  conn: duckdb.AsyncDuckDBConnection;
  datasetDuckDbLease: DatasetDuckDbLease;
  tableName: string;
}>;

/** A view's `EXCLUDE` and replacement clauses. */
type ProjectionClauses = Readonly<{
  excludeClause: string;
  replaceClause: string;
}>;

async function _createParquetView(
  options: ViewLoadContext & ProjectionClauses,
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
 * Creates an auxiliary view beside the dataset's public view and over the
 * same registered file: `ava_rows_<id>`, with the public view's projection
 * plus `file_row_number`, which `SELECT *` picks up once
 * `file_row_number = true` is set, or `ava_raw_<id>`, with the renames and
 * casts but none of the conversions.
 */
async function _createAuxiliaryView(
  options: ViewLoadContext &
    ProjectionClauses &
    Readonly<{ viewName: string; readParquetOptions: string }>,
): Promise<void> {
  await options.client.runRawQuery(
    `CREATE VIEW IF NOT EXISTS "$viewName$" AS
    SELECT * $excludeClause$ $replaceClause$
    FROM read_parquet("$tableName$"$readParquetOptions$)`,
    {
      conn: options.conn,
      datasetDuckDbLease: options.datasetDuckDbLease,
      [TRUSTED_INTERNAL_SQL]: true,
      params: {
        viewName: options.viewName,
        tableName: options.tableName,
        readParquetOptions: options.readParquetOptions,
        replaceClause: options.replaceClause,
        excludeClause: options.excludeClause,
      },
    },
  );
}

/**
 * Drops an auxiliary view.
 *
 * Deliberately a plain `DROP VIEW`, not `client.dropTableViewAndFile`: that
 * helper treats its argument as a dataset id when it takes the coordinator
 * lease, and an `ava_rows_` or `ava_raw_` name is not one. There is also no
 * registered file of its own to drop, because it reads the dataset's file.
 *
 * KNOWN GAP, deliberate: this load path is the auxiliary views' only
 * lifecycle owner, so a dataset dropped through `dropTableViewAndFile` and
 * never reloaded leaves orphan views over a dropped file. Adding the drop to
 * that shared helper was tried and reverted: it changed the drop sequence
 * every dataset drop goes through and broke four leasing tests, which is too
 * much risk for an orphan that only fails if something queries it. Fix it
 * with the spine caching work, which needs this lifecycle anyway.
 */
async function _dropAuxiliaryView(
  options: ViewLoadContext & Readonly<{ viewName: string }>,
): Promise<void> {
  await options.client.runRawQuery(`DROP VIEW IF EXISTS "$viewName$"`, {
    conn: options.conn,
    datasetDuckDbLease: options.datasetDuckDbLease,
    [TRUSTED_INTERNAL_SQL]: true,
    params: { viewName: options.viewName },
  });
}

/**
 * Reads, from the registered file, the values each ordered column's
 * conversion keeps beside its labels, by original column name. They
 * complete the column's `ENUM`, so the view's cast never meets a value it
 * lacks. Run one at a time on the load's own connection.
 */
async function _readKeptEnumValues(
  options: ViewLoadContext &
    Readonly<{
      columnReplacements: DuckDbLoadParquetOptions["columnReplacements"];
    }>,
): Promise<Record<string, string[]>> {
  const queries = getKeptEnumValuesQueries({
    columnReplacements: options.columnReplacements,
    relationSql: `read_parquet(${quoteSqlIdentifier(options.tableName)})`,
  });
  const entries = await promiseMapSequential(queries, async (query) => {
    const { data } = await options.client.runRawQuery<{ kept_value: string }>(
      query.sql,
      {
        conn: options.conn,
        datasetDuckDbLease: options.datasetDuckDbLease,
        [TRUSTED_INTERNAL_SQL]: true,
      },
    );
    const keptValues = data.map((row) => {
      return String(row.kept_value);
    });
    return [query.columnName, keptValues] as const;
  });
  return Object.fromEntries(entries);
}

/**
 * Creates the dataset's public view and recreates its two auxiliary views
 * over the registered file. The auxiliary views are recreated with the
 * public view rather than left behind, so a reloaded dataset can never be
 * ordered by a stale row order or profiled through stale casts.
 */
async function _createRelationViews(
  options: ViewLoadContext &
    Readonly<{
      columnReplacements: DuckDbLoadParquetOptions["columnReplacements"];
    }>,
): Promise<void> {
  const { columnReplacements, ...context } = options;
  const keptValuesByColumn = await _readKeptEnumValues(options);
  const projectionClauses = getParquetProjectionClauses(columnReplacements, {
    keptValuesByColumn,
  });
  await _createParquetView({ ...context, ...projectionClauses });
  const rowsViewName = getRowNumberedViewName(context.tableName);
  await _dropAuxiliaryView({ ...context, viewName: rowsViewName });
  await _createAuxiliaryView({
    ...context,
    ...projectionClauses,
    viewName: rowsViewName,
    readParquetOptions: ", file_row_number = true",
  });
  const rawViewName = getRawValuesViewName(context.tableName);
  await _dropAuxiliaryView({ ...context, viewName: rawViewName });
  await _createAuxiliaryView({
    ...context,
    ...getParquetProjectionClauses(columnReplacements, {
      omitsValueMappings: true,
    }),
    viewName: rawViewName,
    readParquetOptions: "",
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
  const { columns, rowCount } = await getLoadedDuckDbTableShape(options);
  return {
    name: options.tableName,
    columns,
    id: uuid(),
    numRows: rowCount,
  };
}

/**
 * Registers a parquet blob and exposes it as the dataset's bare DuckDB view,
 * plus its `ava_rows_` and `ava_raw_` views.
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
    await _createRelationViews({
      client,
      conn,
      datasetDuckDbLease: options.datasetDuckDbLease,
      tableName,
      columnReplacements,
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
