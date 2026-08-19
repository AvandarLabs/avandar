import { useMutation } from "@avandar/query-hooks";
import { MIMEType, snakeCaseKeysShallow, where } from "@avandar/utils";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { makeCsvFromPdfTable } from "@/clients/datasets/makeCsvFromPdfTable/makeCsvFromPdfTable";
import { makePdfTableFingerprintFromTable } from "@/clients/datasets/pdfTableFingerprint/pdfTableFingerprint";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { makeDatasetImportedPayloadFromSaveResult } from "./makeDatasetImportedPayloadFromSaveResult/makeDatasetImportedPayloadFromSaveResult";
import { startOriginalFileUploadIfNeeded } from "./startOriginalFileUploadIfNeeded/startOriginalFileUploadIfNeeded";
import type {
  DatasetImportFormValues,
  DataSourceMetadata,
} from "../DatasetImportForm.types";
import type { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { PdfRegion } from "@/workers/pdfSniff/pdfSniff.types";
import type { UseMutationResultTuple } from "@avandar/query-hooks";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

export type CsvParseOptions = {
  type: "csv_file";
  numRowsToSkip?: number;
  delimiter?: string;
};

export type XlsxParseOptions = {
  type: "xlsx_file";
  sheetName?: string;
  hasHeader?: boolean;
  dateFormat?: string | null;
  timestampFormat?: string | null;
  numRowsToSkip?: number;
};

export type PdfParseOptions = {
  type: "pdf_file";
  /**
   * Regions the user has chosen to extract. Empty until they pick one, which
   * is the normal state immediately after upload.
   */
  regions?: readonly PdfRegion[];
  /** Inclusive, one-based page range the user limited reading to. */
  pageRange?: readonly [number, number];
  outputMode?: "natural" | "observations";
  /**
   * Which model contributed rows, or undefined when the rows came from rules
   * alone. Set by the picker's assist and written to `llm_model` on save,
   * because the workspace privacy log has to be able to answer "did a model
   * see this document" from the dataset row by itself.
   */
  llmModel?: string;
};

export type GoogleSheetsParseOptions = {
  type: "google_sheets";
  numRowsToSkip?: number;
};

export type FileParseOptions =
  | CsvParseOptions
  | XlsxParseOptions
  | PdfParseOptions
  | GoogleSheetsParseOptions;

function _duckDbColumnsToImportedColumns(
  columns: readonly DuckDbColumnSchema[],
): DatasetColumn.Imported[] {
  return columns.map((duckDbColumn, columnIndex) => {
    return {
      name: duckDbColumn.column_name,
      originalName: duckDbColumn.column_name,
      originalDataType: duckDbColumn.column_type,
      detectedDataType: duckDbColumn.column_type,
      dataType: DuckDbDataTypeUtils.toAvaDataType(duckDbColumn.column_type),
      columnIdx: columnIndex,
    };
  });
}

type UseSaveDatasetOptions = {
  /**
   * Called once the dataset has been saved and the success notification
   * has fired, just before the default navigation to the dataset view.
   * Used by the app-wide import modal to close itself.
   */
  onAfterSave?: (savedDataset: Dataset.T) => void;

  /**
   * If set, the default redirect to the dataset view is skipped and this
   * callback is invoked with the saved dataset instead. Use this when the
   * caller wants to handle the post-save action itself (e.g. opening the
   * dataset in the Data Explorer instead of navigating to its detail page).
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

type SaveDatasetValues = DatasetImportFormValues & DataSourceMetadata;

type SaveDatasetMutationContext = {
  isFirstInWorkspace?: boolean;
};

type DatasetInsertContext = {
  datasetDescription: string;
  datasetName: string;
  workspaceId: Dataset.T["workspaceId"];
};

type SaveDatasetMutationOptions = Parameters<
  typeof useMutation<
    Dataset.T,
    SaveDatasetValues,
    Error,
    SaveDatasetMutationContext
  >
>[0];

type CreateSaveDatasetMutationOptions = {
  navigate: ReturnType<typeof useNavigate>;
  notificationCopy: SaveDatasetNotificationCopy;
  onAfterSave: UseSaveDatasetOptions["onAfterSave"];
  onSaveSuccess: UseSaveDatasetOptions["onSaveSuccess"];
  workspaceDatasets: Dataset.T[] | undefined;
  workspaceId: Dataset.T["workspaceId"];
  workspaceSlug: string;
};

type SaveDatasetNotificationCopy = {
  buildSuccessMessage: (datasetName: string) => string;
  errorMessage: string;
  errorTitle: string;
  successTitle: string;
};

type LogDatasetImportedOptions = {
  isFirstInWorkspace: boolean | undefined;
  params: SaveDatasetValues;
  savedDataset: Dataset.T;
  workspaceId: Dataset.T["workspaceId"];
};

type NavigateAfterDatasetSaveOptions = {
  navigate: ReturnType<typeof useNavigate>;
  onAfterSave: UseSaveDatasetOptions["onAfterSave"];
  onSaveSuccess: UseSaveDatasetOptions["onSaveSuccess"];
  savedDataset: Dataset.T;
  workspaceSlug: string;
};

async function _saveCsvDataset(
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
    columns: _duckDbColumnsToImportedColumns(columns).map(snakeCaseKeysShallow),
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

async function _saveGoogleSheetsDataset(
  options: Readonly<{
    context: DatasetInsertContext;
    payload: Extract<DataSourceMetadata, { sourceType: "google_sheets" }>;
  }>,
): Promise<Dataset.T> {
  const { datasetLoadResult, parseOptions } = options.payload;
  const { csvSniff, columns } = datasetLoadResult.sheetLoadMetadata;
  return DatasetClient.insertGoogleSheetsDataset({
    googleAccountId: options.payload.googleAccountId,
    googleDocumentId: options.payload.googleDocumentId,
    columns: _duckDbColumnsToImportedColumns(columns).map(snakeCaseKeysShallow),
    datasetDescription: options.context.datasetDescription,
    datasetId: datasetLoadResult.datasetId,
    datasetName: options.context.datasetName,
    rowsToSkip: parseOptions.numRowsToSkip ?? csvSniff.SkipRows ?? 0,
    workspaceId: options.context.workspaceId,
  });
}

async function _saveXlsxDataset(
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
    columns: _duckDbColumnsToImportedColumns(datasetLoadResult.columns).map(
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

async function _savePdfDataset(
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
    columns: _duckDbColumnsToImportedColumns(transcode.columns).map(
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
    pageRangeStart:
      parseOptions.pageRange ? parseOptions.pageRange[0] - 1 : undefined,
    pageRangeEnd:
      parseOptions.pageRange ? parseOptions.pageRange[1] - 1 : undefined,
    // Fingerprinted from the combination rather than any single region,
    // because the combination is what the dataset's rows actually are.
    fingerprint: await makePdfTableFingerprintFromTable({
      cells: datasetLoadResult.combinedCells,
      headerRows: datasetLoadResult.combinedHeaderRows,
    }),
  });
}

function _saveDatasetFromValues(
  options: Readonly<{
    values: SaveDatasetValues;
    workspaceId: Dataset.T["workspaceId"];
  }>,
): Promise<Dataset.T> {
  const { name, description, ...dataSourceMetadata } = options.values;
  const context = {
    datasetDescription: description,
    datasetName: name,
    workspaceId: options.workspaceId,
  };
  return match(dataSourceMetadata)
    .with({ sourceType: "csv_file" }, (payload) => {
      return _saveCsvDataset({ context, payload });
    })
    .with({ sourceType: "google_sheets" }, (payload) => {
      return _saveGoogleSheetsDataset({ context, payload });
    })
    .with({ sourceType: "xlsx_file" }, (payload) => {
      return _saveXlsxDataset({ context, payload });
    })
    .with({ sourceType: "pdf_file" }, (payload) => {
      return _savePdfDataset({ context, payload });
    })
    .exhaustive();
}

function _startDatasetUploadIfAllowed(
  options: Readonly<{
    params: SaveDatasetValues;
    savedDataset: Dataset.T;
    workspaceId: Dataset.T["workspaceId"];
  }>,
): void {
  if (
    options.params.sourceType === "google_sheets" ||
    !options.params.onlineStorageAllowed
  ) {
    return;
  }
  void DatasetParquetStorageClient.startDatasetUpload({
    workspaceId: options.workspaceId,
    datasetId: options.savedDataset.id,
    sourceType: options.params.sourceType,
  });
}

/**
 * Kicks off the retained-original upload (e.g. the source PDF a table was
 * extracted from) alongside the parquet upload. The two are independent:
 * the parquet upload internally waits on the background transcode to
 * finish, but the original is already on disk with no such dependency, so
 * this is fired without sequencing after `_startDatasetUploadIfAllowed`.
 *
 * Unlike the parquet upload (which reports its own progress/error state via
 * `DatasetUploadProgressStore`), a failed original upload has no other
 * surface, so a failure here is routed through `notifyError` directly. The
 * dataset itself was already saved successfully by this point, so the
 * message is careful to say only the original failed to sync.
 */
function _startOriginalFileUploadIfAllowed(
  options: Readonly<{
    params: SaveDatasetValues;
    savedDataset: Dataset.T;
    workspaceId: Dataset.T["workspaceId"];
  }>,
): void {
  if (
    options.params.sourceType === "google_sheets" ||
    !options.params.onlineStorageAllowed
  ) {
    return;
  }
  void startOriginalFileUploadIfNeeded({
    workspaceId: options.workspaceId,
    datasetId: options.savedDataset.id,
    sourceType: options.params.sourceType,
    onlineStorageAllowed: options.params.onlineStorageAllowed,
  }).catch((error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    notifyError({
      // `i18n._(msg\`...\`)` rather than the `t` macro, because this runs
      // outside the hook body where `useLingui`'s `t` is in scope. This is
      // the same pattern `runBackgroundParquetTranscoding` uses.
      title: i18n._(msg`Dataset saved, but its original file failed to upload`),
      message: errorMessage,
    });
  });
}

function _logDatasetImported(
  options: Readonly<LogDatasetImportedOptions>,
): void {
  if (options.isFirstInWorkspace === undefined) {
    return;
  }
  void AnalyticsClient.logEvent({
    event: "dataset.imported",
    workspaceId: options.workspaceId,
    app: "data_sources",
    payload: makeDatasetImportedPayloadFromSaveResult({
      datasetId: options.savedDataset.id,
      source: options.params,
      isFirstInWorkspace: options.isFirstInWorkspace,
    }),
  });
}

function _navigateAfterDatasetSave(
  options: Readonly<NavigateAfterDatasetSaveOptions>,
): void {
  options.onAfterSave?.(options.savedDataset);
  if (options.onSaveSuccess) {
    options.onSaveSuccess(options.savedDataset);
    return;
  }
  options.navigate(
    AppLinks.dataManagerDatasetView({
      workspaceSlug: options.workspaceSlug,
      datasetId: options.savedDataset.id,
      datasetName: options.savedDataset.name,
    }),
  );
}

function _notifyDatasetSaveSuccess(
  options: Readonly<{
    copy: SaveDatasetNotificationCopy;
    savedDataset: Dataset.T;
  }>,
): void {
  notifySuccess({
    title: options.copy.successTitle,
    message: options.copy.buildSuccessMessage(options.savedDataset.name),
  });
}

function _notifyDatasetSaveError(
  copy: Readonly<SaveDatasetNotificationCopy>,
): void {
  notifyError({ title: copy.errorTitle, message: copy.errorMessage });
}

function _createSaveDatasetMutationOptions(
  options: Readonly<CreateSaveDatasetMutationOptions>,
): SaveDatasetMutationOptions {
  return {
    queriesToInvalidate: [
      DatasetClient.QueryKeys.getAll(),
      DatasetColumnClient.QueryKeys.getAll(),
    ],
    onMutate: () => {
      return {
        isFirstInWorkspace:
          options.workspaceDatasets === undefined ?
            undefined
          : options.workspaceDatasets.length === 0,
      };
    },
    mutationFn: (values) => {
      return _saveDatasetFromValues({
        values,
        workspaceId: options.workspaceId,
      });
    },
    onSuccess: async (savedDataset, params, mutationContext) => {
      _notifyDatasetSaveSuccess({
        copy: options.notificationCopy,
        savedDataset,
      });
      _startDatasetUploadIfAllowed({
        params,
        savedDataset,
        workspaceId: options.workspaceId,
      });
      _startOriginalFileUploadIfAllowed({
        params,
        savedDataset,
        workspaceId: options.workspaceId,
      });
      _logDatasetImported({
        isFirstInWorkspace: mutationContext?.isFirstInWorkspace,
        params,
        savedDataset,
        workspaceId: options.workspaceId,
      });
      _navigateAfterDatasetSave({ ...options, savedDataset });
    },
    onError: () => {
      _notifyDatasetSaveError(options.notificationCopy);
    },
  };
}

/** Save an imported dataset and run its post-save side effects. */
export function useSaveDataset(
  options: Readonly<UseSaveDatasetOptions> = {},
): UseMutationResultTuple<
  Dataset.T,
  SaveDatasetValues,
  Error,
  SaveDatasetMutationContext
> {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [workspaceDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  return useMutation(
    _createSaveDatasetMutationOptions({
      navigate,
      notificationCopy: {
        buildSuccessMessage: (datasetName) => {
          return t`Dataset "${datasetName}" saved successfully`;
        },
        errorMessage: t`An error occurred while saving the dataset`,
        errorTitle: t`Error saving dataset`,
        successTitle: t`Dataset saved`,
      },
      onAfterSave: options.onAfterSave,
      onSaveSuccess: options.onSaveSuccess,
      workspaceDatasets,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
    }),
  );
}
