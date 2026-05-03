import { useMutation } from "@hooks/useMutation/useMutation";
import { Box, BoxProps, Stack } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@ui/notifications/notify";
import { formatNumber } from "@utils/numbers/formatNumber/formatNumber";
import { MIMEType } from "@utils/types/common.types";
import { uuid } from "$/lib/uuid";
import { useMemo, useState } from "react";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { UnknownRow } from "@/clients/DuckDBClient/DuckDBClient";
import { DuckDbLoadCsvResult } from "@/clients/DuckDBClient/DuckDBClient.types";
import { DuckDBDataTypeUtils } from "@/clients/DuckDBClient/DuckDBDataType";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { AppConfig } from "@/config/AppConfig";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { FileUploadForm } from "@/lib/ui/singleton-forms/FileUploadForm";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserId } from "$/models/User/User.types";

type ParseCsvOptions = {
  file: File;
  datasetId: Dataset.Id;
  numRowsToSkip?: number;
  delimiter?: string;
};

type LoadResults = {
  datasetId: Dataset.Id;
  metadata: DuckDbLoadCsvResult;
  previewRows: UnknownRow[];
};

type Props = BoxProps;

export function ManualUploadView(props: Props): JSX.Element {
  const user = useCurrentUser();
  const workspace = useCurrentWorkspace();
  const [uploadedFile, setUploadedFile] = useState<File | undefined>();
  const [loadResults, setLoadResults] = useState<LoadResults>();
  const [parseCsv, isParsingCsv] = useMutation({
    mutationFn: async (options: ParseCsvOptions): Promise<LoadResults> => {
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

      // now query the file for the rows to preview
      const previewData = await DatasetQueryClient.getPreviewData({
        datasetId,
        numRows: AppConfig.dataManagerApp.maxPreviewRows,
        workspaceId: workspace.id,
      });
      return { datasetId, metadata: loadResult, previewRows: previewData };
    },
    onSuccess: (results) => {
      setLoadResults(results);
      const {
        metadata: { numRows: numSuccessRows, numRejectedRows },
      } = results;
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

  const onRequestFileParse = (file: File) => {
    const datasetId = uuid() as Dataset.Id;
    setUploadedFile(file);
    parseCsv({ file, datasetId });
  };

  const detectedColumns = useMemo(() => {
    return loadResults?.metadata.columns.map((duckColumn, idx) => {
      return {
        name: duckColumn.column_name,
        originalName: duckColumn.column_name,
        originalDataType: duckColumn.column_type,
        detectedDataType: duckColumn.column_type,
        dataType: DuckDBDataTypeUtils.toAvaDataType(duckColumn.column_type),
        columnIdx: idx,
      };
    });
  }, [loadResults]);

  const onFileSubmit = (file: File | undefined) => {
    if (file) {
      onRequestFileParse(file);
    } else {
      notifyError({
        title: "No file selected",
        message: "Please select a file to import",
      });
    }
  };

  return (
    <Box {...props}>
      <Stack align="flex-start">
        <FileUploadForm
          label="Upload a CSV"
          description="Select a CSV from your computer to import"
          placeholder="Select file"
          accept={MIMEType.TEXT_CSV}
          fullWidth
          isSubmitting={isParsingCsv}
          onSubmit={onFileSubmit}
        />

        {detectedColumns && uploadedFile && loadResults ?
          <DatasetImportForm
            key={loadResults.metadata.id}
            initialDatasetName={uploadedFile.name}
            initialDatasetId={loadResults.datasetId}
            rows={loadResults.previewRows}
            columns={detectedColumns}
            onDatasetSaved={({ savedDataset, datasetFormValues }) => {
              if (!datasetFormValues.onlineStorageAllowed) {
                return;
              }

              // begin the only sync of the dataset to our cloud data storage
              void DatasetParquetStorageClient.startDatasetUpload({
                workspaceId: workspace.id,
                datasetId: savedDataset.id,
              });
            }}
            loadCsvResult={loadResults.metadata}
            onRequestDataParse={async (parseConfig: {
              numRowsToSkip: number;
              delimiter: string;
            }) => {
              await LocalDatasetClient.dropLocalDataset({
                datasetId: loadResults.datasetId,
              });
              // generate a new dataset id for this new parsing
              const nextDatasetId = uuid() as Dataset.Id;
              const nextParseOptions: ParseCsvOptions = {
                file: uploadedFile,
                datasetId: nextDatasetId,
                numRowsToSkip: parseConfig.numRowsToSkip,
                delimiter: parseConfig.delimiter,
              };
              onRequestFileParse(uploadedFile);
              parseCsv(nextParseOptions);
            }}
            isProcessing={isParsingCsv}
            importPayload={{
              sourceType: "csv_file",
              sizeInBytes: uploadedFile.size,
            }}
          />
        : null}

        <Dropzone.FullScreen
          onDrop={(files: FileWithPath[]) => {
            const file = files[0];
            if (file) {
              onRequestFileParse(file);
            }
          }}
        >
          <Dropzone.Accept>
            <IconUpload
              size={52}
              color="var(--mantine-color-blue-6)"
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={52} color="var(--mantine-color-red-6)" stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto
              size={52}
              color="var(--mantine-color-dimmed)"
              stroke={1.5}
            />
          </Dropzone.Idle>
        </Dropzone.FullScreen>
      </Stack>
    </Box>
  );
}
