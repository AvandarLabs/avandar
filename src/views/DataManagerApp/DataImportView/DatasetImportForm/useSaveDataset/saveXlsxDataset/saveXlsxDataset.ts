import { snakeCaseKeysShallow } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { duckDbColumnsToImportedColumns } from "../duckDbColumnsToImportedColumns/duckDbColumnsToImportedColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DataSourceMetadata } from "../../DatasetImportForm.types";
import type { DatasetInsertContext } from "../useSaveDataset";

/** Inserts a dataset backed by an uploaded XLSX file. */
export async function saveXlsxDataset(
  options: Readonly<{
    context: DatasetInsertContext;
    payload: Extract<DataSourceMetadata, { sourceType: "xlsx_file" }>;
  }>,
): Promise<Dataset.T> {
  const { datasetLoadResult, onlineStorageAllowed, parseOptions, sizeInBytes } =
    options.payload;
  return DatasetClient.insertXlsxFileDataset({
    datasetId: datasetLoadResult.datasetId,
    workspaceId: options.context.workspaceId,
    datasetName: options.context.datasetName,
    datasetDescription: options.context.datasetDescription,
    columns: duckDbColumnsToImportedColumns(datasetLoadResult.columns).map(
      snakeCaseKeysShallow,
    ),
    isInCloudStorage: onlineStorageAllowed,
    sizeInBytes,
    rowsToSkip: parseOptions.numRowsToSkip ?? 0,
    sheetName: parseOptions.sheetName,
    hasHeader: parseOptions.hasHeader ?? true,
    dateFormat: parseOptions.dateFormat ?? undefined,
    timestampFormat: parseOptions.timestampFormat ?? undefined,
  });
}
