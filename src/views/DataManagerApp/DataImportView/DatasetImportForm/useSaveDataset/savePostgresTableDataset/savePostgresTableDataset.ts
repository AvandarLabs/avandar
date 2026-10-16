import { snakeCaseKeysShallow } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { duckDbColumnsToImportedColumns } from "../duckDbColumnsToImportedColumns/duckDbColumnsToImportedColumns";
import type { DatasetInsertContext } from "../useSaveDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DataSourceMetadata } from "../../DatasetImportForm.types";

/** Inserts a dataset backed by a Postgres table or view. */
export async function savePostgresTableDataset(
  options: Readonly<{
    context: DatasetInsertContext;
    payload: Extract<DataSourceMetadata, { sourceType: "postgres_table" }>;
  }>,
): Promise<Dataset.T> {
  const { connectionId, datasetLoadResult } = options.payload;
  const { columns, relationKind, schemaName, tableName } = datasetLoadResult;
  return DatasetClient.insertPostgresTableDataset({
    connectionId,
    schemaName,
    tableName,
    relationKind,
    columns: duckDbColumnsToImportedColumns(columns).map(snakeCaseKeysShallow),
    datasetDescription: options.context.datasetDescription,
    datasetId: datasetLoadResult.datasetId,
    datasetName: options.context.datasetName,
    workspaceId: options.context.workspaceId,
  });
}
