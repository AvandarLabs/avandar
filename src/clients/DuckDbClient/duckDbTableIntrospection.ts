import * as arrow from "apache-arrow";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
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
