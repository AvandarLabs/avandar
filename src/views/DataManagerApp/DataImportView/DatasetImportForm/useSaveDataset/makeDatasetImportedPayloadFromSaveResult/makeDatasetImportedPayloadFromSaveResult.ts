import type { AnalyticsEventPayloads } from "$/analytics/analyticsEvents/analyticsEvents";

type FileImportAnalyticsSource = {
  sourceType: "csv_file" | "xlsx_file";
  datasetLoadResult: {
    numRows: number;
    columns: readonly unknown[];
  };
};

type GoogleSheetsImportAnalyticsSource = {
  sourceType: "google_sheets";
  datasetLoadResult: {
    numRows: number;
    sheetLoadMetadata: { columns: readonly unknown[] };
  };
};

type DatasetImportAnalyticsSource =
  | FileImportAnalyticsSource
  | GoogleSheetsImportAnalyticsSource;

/** Derives privacy-safe analytics dimensions from a successful dataset save. */
export function makeDatasetImportedPayloadFromSaveResult(
  options: Readonly<{
    datasetId: string;
    source: DatasetImportAnalyticsSource;
    isFirstInWorkspace: boolean;
  }>,
): AnalyticsEventPayloads["dataset.imported"] {
  const { source } = options;
  const columnCount =
    source.sourceType === "google_sheets" ?
      source.datasetLoadResult.sheetLoadMetadata.columns.length
    : source.datasetLoadResult.columns.length;

  return {
    datasetId: options.datasetId,
    sourceType: source.sourceType,
    columnCount,
    rowCount: source.datasetLoadResult.numRows,
    isFirstInWorkspace: options.isFirstInWorkspace,
  };
}
