import {
  useMutation,
  UseMutationResultTuple,
} from "@hooks/useMutation/useMutation";
import { notifyError, notifySuccess, notifyWarning } from "@ui/index";
import { formatNumber } from "@utils/index";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { UserId } from "$/models/User/User.types";
import { useState } from "react";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import { DuckDbLoadCsvResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import { AppConfig } from "@/config/AppConfig";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

type LoadFileResult = {
  datasetId: Dataset.Id;
} & DuckDbLoadCsvResult;

type UseLoadManualUploadFileResult = {
  loadFile: UseMutationResultTuple<LoadFileResult, ParseCsvOptions>[0];
  isLoadingFile: UseMutationResultTuple<LoadFileResult, ParseCsvOptions>[1];
  datasetLoadMetadata: LoadFileResult | undefined;
  previewRows: UnknownRow[] | undefined;
};

type ParseCsvOptions = {
  file: File;
  datasetId: Dataset.Id;
  numRowsToSkip?: number;
  delimiter?: string;
};

/**
 * Loads a manually uploaded file into our local storage and DuckDB and
 * returns the loaded dataset information.
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
  const [datasetLoadMetadata, setDatasetLoadMetadata] = useState<
    LoadFileResult | undefined
  >();

  const [previewRows] = DatasetQueryClient.useGetPreviewData({
    datasetId: datasetLoadMetadata?.datasetId,
    numRows: AppConfig.dataManagerApp.maxPreviewRows,
    workspaceId: workspace.id,
    useQueryOptions: {
      enabled: !!datasetLoadMetadata,
    },
  });

  const [loadManualUploadFile, isLoadingManualUploadFile] = useMutation({
    mutationFn: async (options: ParseCsvOptions) => {
      const { file, datasetId, numRowsToSkip, delimiter } = options;
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
    },
    onSuccess: (loadResults) => {
      const { numRows: numSuccessRows, numRejectedRows } = loadResults;
      setDatasetLoadMetadata(loadResults);
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
    },
  });

  return {
    datasetLoadMetadata,
    loadFile: loadManualUploadFile,
    isLoadingFile: isLoadingManualUploadFile,
    previewRows,
  };
}
