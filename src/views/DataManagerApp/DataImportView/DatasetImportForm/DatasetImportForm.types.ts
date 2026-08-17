import type {
  CsvFileLoadResult,
  XlsxFileLoadResult,
} from "../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type {
  CsvParseOptions,
  FileParseOptions,
  GoogleSheetsParseOptions,
  XlsxParseOptions,
} from "./useSaveDataset/useSaveDataset";
import type { DuckDbLoadCsvResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { UnknownObject } from "@avandar/utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

export type DatasetImportFormValues = {
  name: string;
  description: string;
};

export type XlsxDataSourceMetadata = {
  sourceType: "xlsx_file";
  onlineStorageAllowed: boolean;
  sizeInBytes: number;

  /** Metadata we extracted during the parsing and loading process */
  datasetLoadResult: XlsxFileLoadResult;

  /**
   * Options used to parse the XLSX. Used in case we need to re-parse and
   * reload the data.
   */
  parseOptions: XlsxParseOptions;
};

export type CsvDataSourceMetadata = {
  sourceType: "csv_file";
  onlineStorageAllowed: boolean;
  sizeInBytes: number;

  /** Metadata we extracted during the parsing and loading process */
  datasetLoadResult: CsvFileLoadResult;

  /**
   * Options used to parse the CSV. Used in case we need to re-parse and
   * reload the data.
   */
  parseOptions: CsvParseOptions;
};

export type ManualUploadDataSourceMetadata =
  | XlsxDataSourceMetadata
  | CsvDataSourceMetadata;

export type BaseLoadResult = {
  datasetId: Dataset.Id;
  numRows: number;
};

export type GoogleSheetsLoadResult = BaseLoadResult & {
  rawText: string;
  sheetLoadMetadata: DuckDbLoadCsvResult;
  spreadsheetName: string;
};

export type GoogleSheetsDataSourceMetadata = {
  sourceType: "google_sheets";
  googleDocumentId: string;
  googleAccountId: string;
  datasetLoadResult: GoogleSheetsLoadResult;

  /**
   * Options used to parse and load the Google Sheets. Used in case we ever
   * need to re-parse and reload the data.
   */
  parseOptions: GoogleSheetsParseOptions;
};

export type DataSourceMetadata =
  | XlsxDataSourceMetadata
  | CsvDataSourceMetadata
  | GoogleSheetsDataSourceMetadata;

export type DatasetImportFormProps = {
  /**
   * Regardless of how many rows are passed in, only the first
   * `GlobalAppConfig.dataManagerApp.maxPreviewRows` will be displayed.
   */
  rows: readonly UnknownObject[];
  initialDatasetName: string;
  disableSubmit?: boolean;

  /** When the user requests to parse the data again. */
  onRequestDataReparse: (parseOptions: FileParseOptions) => void;
  isProcessing?: boolean;

  /**
   * When the user changes the data source metadata, such as the parse options.
   */
  onDataSourceMetadataChange: (options: DataSourceMetadata) => void;

  /**
   * If true, show the "cloud storage" toggle which can mark the dataset as
   * offline-only.
   */
  showOnlineStorageAllowed?: boolean;

  /** Source-specific metadata used when persisting the dataset. */
  dataSourceMetadata: DataSourceMetadata;

  /** The parse options for the dataset. This is a controlled component. */
  parseOptions: FileParseOptions;

  /**
   * Optional callback fired after the dataset is saved successfully.
   * Used by the app-wide import modal to close itself before the
   * default post-save navigation runs.
   *
   * Receives the dataset that was just saved. Callers that do not need it can
   * declare no parameters.
   */
  onAfterSave?: (savedDataset: Dataset.T) => void;

  /**
   * If set, this callback is invoked with the saved dataset instead of
   * navigating to the dataset detail page on success. Forwarded to
   * `useSaveDataset`.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};
