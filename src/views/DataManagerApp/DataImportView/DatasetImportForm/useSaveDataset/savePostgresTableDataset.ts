import { snakeCaseKeysShallow } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { duckDbColumnsToImportedColumns } from "./duckDbColumnsToImportedColumns";
import type { DatasetInsertContext } from "./useSaveDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DataSourceMetadata } from "../DatasetImportForm.types";

/**
 * The columns a Postgres dataset stores. The `connectors` proxy sends every
 * row as CSV text, so `detectedDataType` is `VARCHAR`: that is what the
 * rows arrive as. `dataType` keeps the column's declared Postgres type, so
 * relation loading casts every non-text column to it rather than trusting
 * DuckDB's sniff of the values (an all-null integer column sniffs as text,
 * for example). A text column is not cast, so it keeps whatever type the
 * sniff picks.
 */
function _getStoredColumns(
  columns: readonly DuckDbColumnSchema[],
): DatasetColumn.Imported[] {
  return duckDbColumnsToImportedColumns(columns).map((column) => {
    return { ...column, detectedDataType: "VARCHAR" };
  });
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
