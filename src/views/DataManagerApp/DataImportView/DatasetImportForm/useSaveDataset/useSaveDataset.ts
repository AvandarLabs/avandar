import { useMutation } from "@avandar/query-hooks";
import { snakeCaseKeysShallow, where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { ImportedDatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DuckDbColumnSchema } from "@/clients/DuckDbClient/DuckDbClient.types";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import {
  DatasetImportFormValues,
  DataSourceMetadata,
} from "../DatasetImportForm";
import { makeDatasetImportedPayloadFromSaveResult } from "./makeDatasetImportedPayloadFromSaveResult/makeDatasetImportedPayloadFromSaveResult";
import type { UseMutationResultTuple } from "@avandar/query-hooks";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

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

export type GoogleSheetsParseOptions = {
  type: "google_sheets";
  numRowsToSkip?: number;
};

export type FileParseOptions =
  | CsvParseOptions
  | XlsxParseOptions
  | GoogleSheetsParseOptions;

function _duckDbColumnsToImportedColumns(
  columns: DuckDbColumnSchema[],
): ImportedDatasetColumn[] {
  return columns.map((duckDbCol, idx) => {
    return {
      name: duckDbCol.column_name,
      originalName: duckDbCol.column_name,
      originalDataType: duckDbCol.column_type,
      detectedDataType: duckDbCol.column_type,
      dataType: DuckDbDataTypeUtils.toAvaDataType(duckDbCol.column_type),
      columnIdx: idx,
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

type SaveDatasetMutationContext = {
  isFirstInWorkspace?: boolean;
};

export function useSaveDataset(
  options: UseSaveDatasetOptions = {},
): UseMutationResultTuple<
  Dataset.T,
  DatasetImportFormValues & DataSourceMetadata,
  Error,
  SaveDatasetMutationContext
> {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const { onSaveSuccess } = options;
  const [workspaceDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  return useMutation<
    Dataset.T,
    DatasetImportFormValues & DataSourceMetadata,
    Error,
    SaveDatasetMutationContext
  >({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onMutate: () => {
      return {
        isFirstInWorkspace:
          workspaceDatasets === undefined ? undefined : (
            workspaceDatasets.length === 0
          ),
      };
    },
    mutationFn: (values: DatasetImportFormValues & DataSourceMetadata) => {
      const { name, description, ...dataSourceMetadata } = values;
      return match(dataSourceMetadata)
        .with({ sourceType: "csv_file" }, async (payload) => {
          const {
            sizeInBytes,
            datasetLoadResult: datasetLoadMetadata,
            onlineStorageAllowed,
            parseOptions,
          } = payload;
          const { csvSniff, columns } = datasetLoadMetadata;
          const importedColumns = _duckDbColumnsToImportedColumns(columns);

          const dataset = await DatasetClient.insertCsvFileDataset({
            datasetId: datasetLoadMetadata.datasetId,
            workspaceId: workspace.id,
            datasetName: name,
            datasetDescription: description,
            columns: importedColumns.map(snakeCaseKeysShallow),
            isInCloudStorage: onlineStorageAllowed,
            sizeInBytes,
            parseOptions: {
              // use the user-defined parse options here first. Otherwise,
              // default to the sniffed options.
              rowsToSkip: parseOptions.numRowsToSkip ?? csvSniff.SkipRows,
              delimiter: parseOptions.delimiter ?? csvSniff.Delimiter,

              // Fill in the other options from the CSV sniff object
              quoteChar: csvSniff.Quote,
              escapeChar: csvSniff.Escape,
              newlineDelimiter: csvSniff.NewLineDelimiter,
              commentChar: csvSniff.Comment,
              hasHeader: csvSniff.HasHeader,
              dateFormat: csvSniff.DateFormat,
              timestampFormat: csvSniff.TimestampFormat,
            },
          });
          return dataset;
        })
        .with({ sourceType: "google_sheets" }, async (payload) => {
          const { datasetLoadResult, parseOptions } = payload;
          const { csvSniff, columns } = datasetLoadResult.sheetLoadMetadata;
          const { googleAccountId, googleDocumentId } = payload;
          const importedColumns = _duckDbColumnsToImportedColumns(columns);
          const dataset = await DatasetClient.insertGoogleSheetsDataset({
            googleAccountId,
            googleDocumentId,
            columns: importedColumns.map(snakeCaseKeysShallow),
            datasetDescription: description,
            datasetId: datasetLoadResult.datasetId,
            datasetName: name,
            rowsToSkip: parseOptions.numRowsToSkip ?? csvSniff.SkipRows ?? 0,
            workspaceId: workspace.id,
          });
          return dataset;
        })
        .with({ sourceType: "xlsx_file" }, async (payload) => {
          const {
            sizeInBytes,
            datasetLoadResult: datasetLoadMetadata,
            onlineStorageAllowed,
            parseOptions,
          } = payload;
          const { columns } = datasetLoadMetadata;
          const importedColumns = _duckDbColumnsToImportedColumns(columns);
          const dataset = await DatasetClient.insertXlsxFileDataset({
            datasetId: datasetLoadMetadata.datasetId,
            workspaceId: workspace.id,
            datasetName: name,
            datasetDescription: description,
            columns: importedColumns.map(snakeCaseKeysShallow),
            isInCloudStorage: onlineStorageAllowed,
            sizeInBytes,
            rowsToSkip: parseOptions.numRowsToSkip ?? 0,
            sheetName: parseOptions.sheetName,
            hasHeader: parseOptions.hasHeader ?? true,
            dateFormat: parseOptions.dateFormat ?? null,
            timestampFormat: parseOptions.timestampFormat ?? null,
          });
          return dataset;
        })
        .exhaustive(() => {
          throw new Error(
            `Unsupported dataset source type: ${dataSourceMetadata.sourceType}`,
          );
        });
    },
    onSuccess: async (savedDataset, params, mutationContext) => {
      notifySuccess({
        title: t`Dataset saved`,
        message: t`Dataset "${savedDataset.name}" saved successfully`,
      });

      // Handle post-save actions, such as uploading the dataset to cloud
      // storage if it was allowed by the user.
      match(params)
        .with({ sourceType: "csv_file" }, { sourceType: "xlsx_file" }, (p) => {
          if (p.onlineStorageAllowed) {
            // begin uploading the dataset to our cloud data storage
            // we do not `await` this so that we don't block the navigation
            // back to the data manager view
            void DatasetParquetStorageClient.startDatasetUpload({
              workspaceId: workspace.id,
              datasetId: savedDataset.id,
              sourceType: params.sourceType,
            });
          }
          return;
        })
        .with({ sourceType: "google_sheets" }, () => {
          // Do nothing. There is no post-save action for Google Sheets
          // datasets.
          return;
        })
        .exhaustive(() => {
          throw new Error(
            `Unsupported dataset source type: ${params.sourceType}`,
          );
        });

      if (mutationContext?.isFirstInWorkspace !== undefined) {
        void AnalyticsClient.logEvent({
          event: "dataset.imported",
          workspaceId: workspace.id,
          app: "data_sources",
          payload: makeDatasetImportedPayloadFromSaveResult({
            datasetId: savedDataset.id,
            source: params,
            isFirstInWorkspace: mutationContext.isFirstInWorkspace,
          }),
        });
      }

      options.onAfterSave?.(savedDataset);

      if (onSaveSuccess) {
        onSaveSuccess(savedDataset);
        return;
      }

      navigate(
        AppLinks.dataManagerDatasetView({
          workspaceSlug: workspace.slug,
          datasetId: savedDataset.id,
          datasetName: savedDataset.name,
        }),
      );
    },
    onError: () => {
      notifyError({
        title: t`Error saving dataset`,
        message: t`An error occurred while saving the dataset`,
      });
    },
  });
}
