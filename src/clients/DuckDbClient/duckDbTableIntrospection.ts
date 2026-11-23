import * as arrow from "apache-arrow";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";

/** Reads the names of every base table or view in the `main` schema. */
export async function getDuckDbRelationNames(
  options: Readonly<{
    client: DuckDbClientOperations;
    tableType: "BASE TABLE" | "VIEW";
  }>,
): Promise<string[]> {
  const conn = await options.client.connect();
  const result = await conn.query<{ table_name: arrow.DataType }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'main' AND table_type = '${options.tableType}'
    `);
  const relationNames: string[] = result.toArray().map((row) => {
    return row.table_name;
  });
  await options.client.closeConnection(conn);
  return relationNames;
}

/**
 * Drops a table or view and its backing file, and clears any snapshot
 * ownership recorded for it.
 *
 * The caller must already hold the dataset's DuckDB lease. If the relation
 * does not exist this does nothing rather than throwing.
 */
export async function dropDuckDbTableViewAndFile(
  options: Readonly<{
    client: DuckDbClientOperations;
    datasetDuckDbLease: DatasetDuckDbLease;
    hasTable: (tableName: string) => Promise<boolean>;
    hasView: (viewName: string) => Promise<boolean>;
    tableOrViewName: string;
  }>,
): Promise<void> {
  const { client, datasetDuckDbLease, tableOrViewName } = options;
  DatasetDuckDbCoordinator.clearPublicSnapshotDatasetOwner(tableOrViewName);
  try {
    const db = await client.getDb();

    const hasView = await options.hasView(tableOrViewName);
    if (hasView) {
      await client.runRawQuery('DROP VIEW "$tableName$"', {
        params: { tableName: tableOrViewName },
        datasetDuckDbLease,
      });
    } else {
      const hasTable = await options.hasTable(tableOrViewName);
      if (hasTable) {
        await client.runRawQuery('DROP TABLE "$tableName$"', {
          params: { tableName: tableOrViewName },
          datasetDuckDbLease,
        });
      }
    }

    await db.dropFile(tableOrViewName);
  } catch (error: unknown) {
    DatasetDuckDbCoordinator.markDatasetDuckDbTableInvalid(tableOrViewName);
    throw error;
  }
}

/**
 * Reads back the columns and row count of a table or view a loader just
 * created.
 *
 * Both reads are marked trusted internal SQL, like the statements that created
 * the table, because the loader's table name need not be a relation: a concept
 * spine's name deliberately resolves to none, and the fail-closed analyzer
 * refuses to read a source it cannot account for. A name that is a dataset is
 * still analyzed as a read of that dataset, so its lease still applies.
 *
 * @returns The table's columns and its number of rows.
 */
export async function getLoadedDuckDbTableShape(
  options: Readonly<{
    client: DuckDbClientOperations;
    tableName: string;
    datasetDuckDbLease: DatasetDuckDbLease;
  }>,
): Promise<{ columns: DuckDbColumnSchema[]; rowCount: number }> {
  const queryOptions = {
    params: { tableName: options.tableName },
    datasetDuckDbLease: options.datasetDuckDbLease,
    [TRUSTED_INTERNAL_SQL]: true,
  } as const;
  const [schemaResult, countResult] = await Promise.all([
    options.client.runRawQuery<DuckDbColumnSchema>(
      `DESCRIBE "$tableName$"`,
      queryOptions,
    ),
    options.client.runRawQuery<{ count: bigint }>(
      `SELECT count(*) as count FROM "$tableName$"`,
      queryOptions,
    ),
  ]);
  return {
    columns: schemaResult.data,
    rowCount: Number(countResult.data[0]?.count ?? 0),
  };
}
