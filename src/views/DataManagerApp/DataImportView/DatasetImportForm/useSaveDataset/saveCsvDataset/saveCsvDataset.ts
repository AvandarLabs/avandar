import { snakeCaseKeysShallow } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { duckDbColumnsToImportedColumns } from "../duckDbColumnsToImportedColumns/duckDbColumnsToImportedColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DataSourceMetadata } from "../../DatasetImportForm.types";
import type { DatasetInsertContext } from "../useSaveDataset";

/** Inserts a dataset backed by an uploaded CSV file. */
export async function saveCsvDataset(
  options: Readonly<{
    context: DatasetInsertContext;
    payload: Extract<DataSourceMetadata, { sourceType: "csv_file" }>;
  }>,
): Promise<Dataset.T> {
  const { datasetLoadResult, onlineStorageAllowed, parseOptions, sizeInBytes } =
    options.payload;
  const { csvSniff, columns } = datasetLoadResult;
  return DatasetClient.insertCsvFileDataset({
    datasetId: datasetLoadResult.datasetId,
    workspaceId: options.context.workspaceId,
    datasetName: options.context.datasetName,
    datasetDescription: options.context.datasetDescription,
    columns: duckDbColumnsToImportedColumns(columns).map(snakeCaseKeysShallow),
    isInCloudStorage: onlineStorageAllowed,
    sizeInBytes,
    parseOptions: {
      rowsToSkip: parseOptions.numRowsToSkip ?? csvSniff.SkipRows,
      delimiter: parseOptions.delimiter ?? csvSniff.Delimiter,
      quoteChar: csvSniff.Quote,
      escapeChar: csvSniff.Escape,
      newlineDelimiter: csvSniff.NewLineDelimiter,
      commentChar: csvSniff.Comment,
      hasHeader: csvSniff.HasHeader,
      dateFormat: csvSniff.DateFormat ?? undefined,
      timestampFormat: csvSniff.TimestampFormat ?? undefined,
    },
  });
}
