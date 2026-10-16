import { snakeCaseKeysShallow } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { duckDbColumnsToImportedColumns } from "../duckDbColumnsToImportedColumns/duckDbColumnsToImportedColumns";
import type { DatasetInsertContext } from "../useSaveDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DataSourceMetadata } from "../../DatasetImportForm.types";

/** Inserts a dataset backed by a Google Sheets tab. */
export async function saveGoogleSheetsDataset(
  options: Readonly<{
    context: DatasetInsertContext;
    payload: Extract<DataSourceMetadata, { sourceType: "google_sheets" }>;
  }>,
): Promise<Dataset.T> {
  const { datasetLoadResult } = options.payload;
  const { columns, sheetName } = datasetLoadResult;
  return DatasetClient.insertGoogleSheetsDataset({
    googleAccountId: options.payload.googleAccountId,
    googleDocumentId: options.payload.googleDocumentId,
    columns: duckDbColumnsToImportedColumns(columns).map(snakeCaseKeysShallow),
    datasetDescription: options.context.datasetDescription,
    datasetId: datasetLoadResult.datasetId,
    datasetName: options.context.datasetName,
    // The tab the download actually read, and deliberately preferred over
    // `parseOptions.sheetName`, which is only the tab the user has *selected*.
    // The two diverge when a user picks a different tab and saves without
    // pressing "Process data again": the stored columns are still the old
    // tab's, so recording the new tab's name would leave `sheet_name`
    // disagreeing with `dataset_columns`, and acquisition would then read a tab
    // whose schema was never validated.
    //
    // Always a concrete name, so a stored `null` stays a legacy value that only
    // pre-tab-column rows carry.
    sheetName,
    // No control offers a row skip for Sheets yet. See the note on
    // `GoogleSheetsParseOptions`.
    rowsToSkip: 0,
    workspaceId: options.context.workspaceId,
  });
}
