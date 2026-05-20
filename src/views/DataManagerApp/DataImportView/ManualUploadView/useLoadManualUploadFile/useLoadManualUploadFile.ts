import { useLingui } from "@lingui/react/macro";
import { useMutation, UseMutationResultTuple } from "@hooks";
import { notifyError } from "@ui";
import { MIMEType } from "@utils";
import { uuid } from "$/lib/uuid";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { UserId } from "$/models/User/User.types";
import { useState } from "react";
import { match } from "ts-pattern";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import {
  DuckDbColumnSchema,
  DuckDbLoadCsvResult,
  DuckDbLoadXlsxResult,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  BaseLoadResult,
  ManualUploadDataSourceMetadata,
} from "../../DatasetImportForm/DatasetImportForm";
import {
  CsvParseOptions,
  XlsxParseOptions,
} from "../../DatasetImportForm/useSaveDataset/useSaveDataset";

type FileLoadOptions = {
  file: File;
  datasetId: Dataset.Id;
};

export type ParseManualFileOptions = CsvParseOptions | XlsxParseOptions;

type LoadAndParseFileOptions = FileLoadOptions & ParseManualFileOptions;

export type CsvFileLoadResult = BaseLoadResult & DuckDbLoadCsvResult;

export type XlsxFileLoadResult = BaseLoadResult & {
  availableSheetNames: string[];
} & DuckDbLoadXlsxResult;

type FileLoadResult = CsvFileLoadResult | XlsxFileLoadResult;

type UseLoadManualUploadFileResult = {
  loadFile: UseMutationResultTuple<FileLoadResult, LoadAndParseFileOptions>[0];
  isLoadingFile: UseMutationResultTuple<
    FileLoadResult,
    LoadAndParseFileOptions
  >[1];
  dataSourceMetadata: ManualUploadDataSourceMetadata | undefined;
  setDataSourceMetadata: (
    newDataSourceMetadata: ManualUploadDataSourceMetadata | undefined,
  ) => void;
  previewRows: UnknownRow[] | undefined;
};

const EMPTY_PARQUET_PLACEHOLDER = new Blob([], {
  type: MIMEType.APPLICATION_PARQUET,
});

/**
 * Convert XLSX sniff preview rows (object keyed by column name with raw
 * cell values) to the column schema shape DuckDB returns from CSV /
 * Parquet sniffs. We can't infer DuckDB types from SheetJS values without
 * additional logic; default to VARCHAR for everything in Phase A. Phase B
 * (the actual `read_xlsx` transcode) reconciles to the real types via
 * `LocalDatasetClient._reconcileColumns`.
 */
function _xlsxColumnNamesToSchema(columnNames: string[]): DuckDbColumnSchema[] {
  return columnNames.map((name) => {
    return {
      column_name: name,
      column_type: "VARCHAR",
      null: "YES",
      key: null,
      default: null,
      extra: null,
    };
  });
}

function _buildDataSourceMetadataFromLoadResult({
  loadResult,
  file,
  loadAndParseOptions,
}: {
  loadResult: FileLoadResult;
  file: File;
  loadAndParseOptions?: LoadAndParseFileOptions;
}): ManualUploadDataSourceMetadata {
  return match(loadResult)
    .with({ type: "csv" }, (csvLoadResult): ManualUploadDataSourceMetadata => {
      const csvRequest =
        loadAndParseOptions?.type === "csv_file" ?
          loadAndParseOptions
        : undefined;
      return {
        sourceType: "csv_file",
        onlineStorageAllowed: true,
        sizeInBytes: file.size,
        datasetLoadResult: csvLoadResult,
        parseOptions: {
          type: "csv_file",
          numRowsToSkip:
            csvRequest?.numRowsToSkip ?? csvLoadResult.csvSniff.SkipRows,
          delimiter: csvRequest?.delimiter ?? csvLoadResult.csvSniff.Delimiter,
        },
      };
    })
    .with(
      { type: "xlsx" },
      (xlsxLoadResult): ManualUploadDataSourceMetadata => {
        const xlsxRequest =
          loadAndParseOptions?.type === "xlsx_file" ?
            loadAndParseOptions
          : undefined;
        const defaultSheetName =
          xlsxLoadResult.availableSheetNames.length === 1 ?
            xlsxLoadResult.availableSheetNames[0]
          : xlsxLoadResult.sheet;
        return {
          sourceType: "xlsx_file",
          onlineStorageAllowed: true,
          sizeInBytes: file.size,
          datasetLoadResult: xlsxLoadResult,
          parseOptions: {
            type: "xlsx_file",
            sheetName: xlsxRequest?.sheetName ?? defaultSheetName,
            hasHeader: xlsxRequest?.hasHeader ?? true,
            numRowsToSkip: xlsxRequest?.numRowsToSkip ?? 0,
            dateFormat: xlsxRequest?.dateFormat ?? null,
            timestampFormat: xlsxRequest?.timestampFormat ?? null,
          },
        };
      },
    )
    .exhaustive();
}

/**
 * Loads a manually uploaded file into our local storage and DuckDB in two
 * phases:
 *
 *   - **Phase A** (foreground, awaited by this hook): a fast sniff that
 *     produces the column schema, parse dialect, and a 200-row preview.
 *     CSV uses DuckDB's `sniff_csv` + LIMIT-pushdown read; XLSX uses a
 *     SheetJS sniff worker so the parse runs off the main thread.
 *
 *   - **Phase B** (background, fired by `startCsvImport` /
 *     `startXlsxImport`): the full `read_csv` / `read_xlsx` → parquet
 *     transcode. Status is tracked in IndexedDB on the LocalDataset row
 *     (`parseStatus`) and in memory via the `ImportJobsManager`. Phase B
 *     emits its own completion toast and column-discrepancy warning.
 *
 * Returns immediately after Phase A so the import form can render. The
 * caller may save the dataset before Phase B completes; the parquet
 * upload to Supabase storage waits on Phase B internally via
 * `ImportJobsManager.waitForCompletion`.
 *
 * IMPORTANT: this does **not** save the dataset to the backend database;
 * that's `useSaveDataset`.
 */
export function useLoadManualUploadFile(): UseLoadManualUploadFileResult {
  const { t } = useLingui();
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const [dataSourceMetadata, setDataSourceMetadata] = useState<
    ManualUploadDataSourceMetadata | undefined
  >();
  const [previewRows, setPreviewRows] = useState<UnknownRow[] | undefined>();

  // Captures the most recent sniff's preview rows so we can hand them to
  // state in `onSuccess`. We can't widen the mutation's return type here
  // without churning every consumer that already calls `loadFile`, so a
  // ref carries the side channel.
  const pendingPreviewRowsRef = useState<{ value: UnknownRow[] | undefined }>(
    () => {
      return { value: undefined };
    },
  )[0];

  const [loadManualUploadFile, isLoadingManualUploadFile] = useMutation({
    mutationFn: async (
      options: LoadAndParseFileOptions,
    ): Promise<FileLoadResult> => {
      const { file } = options;
      return match(options)
        .with({ type: "csv_file" }, async (csvParseOptions) => {
          const { datasetId, numRowsToSkip, delimiter } = csvParseOptions;
          const sniff = await LocalDatasetClient.startCsvImport({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            file,
            parseOptions: { numRowsToSkip, delimiter },
          });
          // Synthesize a `DuckDbLoadCsvResult` from the sniff so the
          // existing import form / save mutation can consume it
          // unchanged. `parquetData` isn't real yet — Phase B will
          // write the actual parquet into the LocalDataset row
          // independently. `numRows` is unknown at Phase A; the toast
          // and save mutation don't error on a fractional value.
          const loadResult: CsvFileLoadResult = {
            datasetId,
            numRows: sniff.previewRows.length,
            id: uuid() as DuckDbLoadCsvResult["id"],
            type: "csv",
            tableName: datasetId,
            csvName: datasetId,
            columns: sniff.columns,
            csvSniff: sniff.csvSniff,
            errors: { rejectedScans: [], rejectedRows: [] },
            numRejectedRows: 0,
            parquetData: EMPTY_PARQUET_PLACEHOLDER,
          };
          pendingPreviewRowsRef.value = sniff.previewRows;
          return loadResult;
        })
        .with({ type: "xlsx_file" }, async (xlsxParseOptions) => {
          const { datasetId, sheetName, hasHeader } = xlsxParseOptions;
          const sniff = await LocalDatasetClient.startXlsxImport({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            file,
            parseOptions: { sheet: sheetName, hasHeader },
          });
          const loadResult: XlsxFileLoadResult = {
            datasetId,
            numRows: sniff.previewRows.length,
            id: uuid() as DuckDbLoadXlsxResult["id"],
            type: "xlsx",
            tableName: datasetId,
            xlsxName: datasetId,
            columns: _xlsxColumnNamesToSchema(sniff.columns),
            sheet: sniff.defaultSheet,
            parquetData: EMPTY_PARQUET_PLACEHOLDER,
            availableSheetNames: sniff.sheets,
          };
          pendingPreviewRowsRef.value = sniff.previewRows as UnknownRow[];
          return loadResult;
        })
        .exhaustive();
    },
    onSuccess: (loadResult, inputParams) => {
      const file = inputParams.file;
      setDataSourceMetadata(
        _buildDataSourceMetadataFromLoadResult({
          loadResult,
          file,
          loadAndParseOptions: inputParams,
        }),
      );
      setPreviewRows(pendingPreviewRowsRef.value);
      pendingPreviewRowsRef.value = undefined;
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      notifyError({
        title: t`Could not read file`,
        message,
      });
    },
  });

  return {
    loadFile: loadManualUploadFile,
    isLoadingFile: isLoadingManualUploadFile,
    previewRows,
    dataSourceMetadata,
    setDataSourceMetadata,
  };
}
