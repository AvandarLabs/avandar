import { MIMEType, snakeCaseKeysShallow } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { makeCsvFromPdfTable } from "@/clients/datasets/makeCsvFromPdfTable/makeCsvFromPdfTable";
import { makePdfTableFingerprintFromTable } from "@/clients/datasets/pdfTableFingerprint/pdfTableFingerprint";
import { duckDbColumnsToImportedColumns } from "../duckDbColumnsToImportedColumns/duckDbColumnsToImportedColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DataSourceMetadata } from "../../DatasetImportForm.types";
import type { DatasetInsertContext } from "../useSaveDataset";

/** Inserts a dataset backed by a reviewed PDF table extraction. */
export async function savePdfDataset(
  options: Readonly<{
    context: DatasetInsertContext;
    payload: Extract<DataSourceMetadata, { sourceType: "pdf_file" }>;
  }>,
): Promise<Dataset.T> {
  const { datasetLoadResult, onlineStorageAllowed, parseOptions, sizeInBytes } =
    options.payload;

  if (datasetLoadResult.status !== "extracted") {
    // The submit button is disabled while a PDF is awaiting a selection, so
    // getting here means something bypassed the form. Saving anyway would
    // write a dataset with no columns and no rows.
    throw new Error("Select a region before saving.");
  }

  // The dataset is rebuilt from `combinedCells`, which is what the review
  // grid has been writing to: corrected values and any model-assisted rows
  // are already in it. The import-time transcode ran against the raw
  // extraction, so without this the saved rows would be the ones the user
  // just finished fixing, in their unfixed form. The review grid exists
  // because association-by-position was measured getting roughly one figure
  // in sixteen silently wrong, so a review that does not reach the data is
  // worse than no review: it manufactures confidence in the same bad rows.
  //
  // This runs once, on save, rather than on every edit: typing each
  // keystroke through DuckDB would be wasteful and would make the grid feel
  // broken.
  const reviewedCsv = makeCsvFromPdfTable({
    cells: datasetLoadResult.combinedCells,
    headerRows: datasetLoadResult.combinedHeaderRows,
  });
  const transcode = await LocalDatasetClient.transcodeReviewedPdfExtraction({
    datasetId: datasetLoadResult.datasetId,
    workspaceId: options.context.workspaceId,
    csvFile: new File([reviewedCsv], `${datasetLoadResult.datasetId}.csv`, {
      type: MIMEType.TEXT_CSV,
    }),
  });

  return DatasetClient.insertPdfFileDataset({
    datasetId: datasetLoadResult.datasetId,
    workspaceId: options.context.workspaceId,
    datasetName: options.context.datasetName,
    datasetDescription: options.context.datasetDescription,
    // The transcode's schema, not the sniff's: it is the authoritative
    // typing of the rows that were actually written.
    columns: duckDbColumnsToImportedColumns(transcode.columns).map(
      snakeCaseKeysShallow,
    ),
    isInCloudStorage: onlineStorageAllowed,
    sizeInBytes,
    // A PDF is pinned in local storage from the moment it is read, so the
    // original exists whether or not the user allowed the cloud upload.
    hasOriginalFile: true,
    regions: parseOptions.regions ?? [],
    outputMode: parseOptions.outputMode ?? "natural",
    llmModel: parseOptions.llmModel,
    // The form's range is inclusive and one-based; the stored one is
    // inclusive and zero-based, matching `PageGeometry.pageIndex`.
    pageRangeStart: parseOptions.pageRange
      ? parseOptions.pageRange[0] - 1
      : undefined,
    pageRangeEnd: parseOptions.pageRange
      ? parseOptions.pageRange[1] - 1
      : undefined,
    // Fingerprinted from the combination rather than any single region,
    // because the combination is what the dataset's rows actually are.
    fingerprint: await makePdfTableFingerprintFromTable({
      cells: datasetLoadResult.combinedCells,
      headerRows: datasetLoadResult.combinedHeaderRows,
    }),
  });
}
