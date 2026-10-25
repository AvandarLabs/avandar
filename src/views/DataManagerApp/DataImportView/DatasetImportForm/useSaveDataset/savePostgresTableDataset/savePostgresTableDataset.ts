import { setPropValue, snakeCaseKeysShallow } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { duckDbColumnsToImportedColumns } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/duckDbColumnsToImportedColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { DatasetInsertContext } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset";

/**
 * The columns a Postgres dataset stores. A Postgres table's column types
 * come from its schema (`source-schema`), so acquisition reads every column
 * of the `connectors` proxy's CSV as text and `detectedDataType` is
 * `VARCHAR`. `dataType` is the type the connector read from the schema, so
 * relation loading casts that text to it.
 */
function _getStoredColumns(
  columns: readonly DuckDbColumnSchema[],
): DatasetColumn.Imported[] {
  return duckDbColumnsToImportedColumns(columns).map(
    setPropValue("detectedDataType", "VARCHAR"),
  );
}

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
    columns: _getStoredColumns(columns).map(snakeCaseKeysShallow),
    datasetDescription: options.context.datasetDescription,
    datasetId: datasetLoadResult.datasetId,
    datasetName: options.context.datasetName,
    workspaceId: options.context.workspaceId,
  });
}
