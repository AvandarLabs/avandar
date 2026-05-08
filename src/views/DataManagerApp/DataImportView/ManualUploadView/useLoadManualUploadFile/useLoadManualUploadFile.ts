import {
  useMutation,
  UseMutationResultTuple,
} from "@hooks/useMutation/useMutation";
import { notifyError, notifySuccess, notifyWarning } from "@ui/index";
import { formatNumber } from "@utils/index";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { UserId } from "$/models/User/User.types";
import { useState } from "react";
import { match } from "ts-pattern";
import * as XLSX from "xlsx";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import {
  DuckDbLoadCsvResult,
  DuckDbLoadXlsxResult,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import { AppConfig } from "@/config/AppConfig";
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
      return {
        sourceType: "csv_file",
        onlineStorageAllowed: true,
        sizeInBytes: file.size,
        datasetLoadResult: csvLoadResult,
        parseOptions: {
          type: "csv_file",
          numRowsToSkip: csvLoadResult.csvSniff.SkipRows,
          delimiter: csvLoadResult.csvSniff.Delimiter,
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

function _notifyLoadResults(loadResult: FileLoadResult): void {
  match(loadResult)
    .with({ type: "csv" }, (csvLoadResult) => {
      const { numRows: numSuccessRows, numRejectedRows } = csvLoadResult;
      if (numRejectedRows === 0) {
        notifySuccess({
          title: "File loaded successfully",
          message: `Parsed ${formatNumber(numSuccessRows)} rows`,
        });
      } else if (numSuccessRows === 0) {
        notifyError({
          title: "File failed to load",
          message: "No rows were read successfully",
        });
      } else {
        const numRejectedStr =
          numRejectedRows > 1000 ?
            " over 1000 rows were rejected"
          : ` ${numRejectedRows} rows were rejected`;
        notifyWarning({
          title: "File was partially loaded",
          message: `Parsed ${numSuccessRows} rows successfully, but ${numRejectedStr}`,
        });
      }
    })
    .with({ type: "xlsx" }, (xlsxLoadResult) => {
      const { numRows: numSuccessRows } = xlsxLoadResult;
      notifySuccess({
        title: "File loaded successfully",
        message: `Parsed ${formatNumber(numSuccessRows)} rows`,
      });
    })
    .exhaustive();
}

/**
 * Loads a manually uploaded file into our local storage and DuckDB and
 * returns the loaded dataset information.
 *
 * IMPORTANT: this does **not** save the dataset to the backend database. This
 * function is just about parsing and loading to memory and local storage.
 *
 * "Loading" a dataset means:
 * 1. Parsing
 * 2. Adding to local storage
 * 3. Loading to in-memory DuckDB
 *
 * Step 1: the way we parse the file depends on the file type. E.g. CSV or
 * Excels are parsed by sending them to DuckDB which has robust and fast parsing
 * capabilities for those filetypes.
 *
 * Step 2: After we parse and extract the necessary metadata, we convert
 * the data to parquet format. The compressed parquet gets added to local
 * storage (IndexedDB).
 *
 * Step 3: If parsing already involved loading the file to DuckDB
 * (e.g. for CSVs), we don't need to do anything further. Otherwise, we
 * load the parsed data into DuckDB so it can be in-memory and ready for
 * querying.
 */
export function useLoadManualUploadFile(): UseLoadManualUploadFileResult {
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const [dataSourceMetadata, setDataSourceMetadata] = useState<
    ManualUploadDataSourceMetadata | undefined
  >();

  const [loadManualUploadFile, isLoadingManualUploadFile] = useMutation({
    mutationFn: async (options: LoadAndParseFileOptions) => {
      const { file } = options;
      return match(options)
        .with({ type: "csv_file" }, async (csvParseOptions) => {
          const { datasetId, numRowsToSkip, delimiter } = csvParseOptions;
          const loadResult = await LocalDatasetClient.storeLocalCSV({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            csvParseOptions: {
              file,
              numRowsToSkip,
              delimiter,
            },
          });
          return { datasetId, ...loadResult };
        })
        .with({ type: "xlsx_file" }, async (xlsxParseOptions) => {
          const { datasetId, sheetName: sheet, hasHeader } = xlsxParseOptions;
          const fileBytes = await file.arrayBuffer();
          const workbook = XLSX.read(fileBytes, { type: "array" });
          const availableSheetNames = workbook.SheetNames;
          const loadResult = await LocalDatasetClient.storeLocalExcel({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            xlsxParseOptions: {
              file,
              sheet,
              hasHeader,
            },
          });
          return { datasetId, availableSheetNames, ...loadResult };
        })
        .exhaustive();
    },
    onSuccess: (loadResult, inputParams) => {
      setDataSourceMetadata(
        _buildDataSourceMetadataFromLoadResult({
          loadResult,
          file: inputParams.file,
          loadAndParseOptions: inputParams,
        }),
      );
      _notifyLoadResults(loadResult);
    },
  });

  const [previewRows] = DatasetQueryClient.useGetPreviewData({
    datasetId: dataSourceMetadata?.datasetLoadResult?.datasetId,
    numRows: AppConfig.dataManagerApp.maxPreviewRows,
    workspaceId: workspace.id,
    useQueryOptions: {
      enabled: !!dataSourceMetadata?.datasetLoadResult,
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
