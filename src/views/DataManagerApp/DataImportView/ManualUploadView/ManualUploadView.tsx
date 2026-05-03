import { Box, BoxProps, Stack } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { notifyError } from "@ui/notifications/notify";
import { MIMEType } from "@utils/types/common.types";
import { uuid } from "$/lib/uuid";
import { useMemo, useState } from "react";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { FileUploadForm } from "@/lib/ui/singleton-forms/FileUploadForm";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import { useLoadManualUploadFile } from "@/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = BoxProps;

export function ManualUploadView(props: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [uploadedFile, setUploadedFile] = useState<File | undefined>();
  const { datasetLoadMetadata, previewRows, loadFile, isLoadingFile } =
    useLoadManualUploadFile();

  const onRequestFileParse = (file: File) => {
    setUploadedFile(file);
    loadFile({ file, datasetId: uuid() as Dataset.Id });
  };

  const detectedColumns = useMemo(() => {
    return datasetLoadMetadata?.columns.map((duckColumn, idx) => {
      return {
        name: duckColumn.column_name,
        originalName: duckColumn.column_name,
        originalDataType: duckColumn.column_type,
        detectedDataType: duckColumn.column_type,
        dataType: DuckDbDataTypeUtils.toAvaDataType(duckColumn.column_type),
        columnIdx: idx,
      };
    });
  }, [datasetLoadMetadata]);

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
          label="Upload an Excel file or CSV"
          description="Select an Excel file or CSV from your computer to import"
          placeholder="Select file"
          accept={[MIMEType.TEXT_CSV, MIMEType.APPLICATION_MS_EXCEL]}
          fullWidth
          isSubmitting={isLoadingFile}
          onSubmit={onFileSubmit}
        />

        {detectedColumns && previewRows && uploadedFile && datasetLoadMetadata ?
          <DatasetImportForm
            key={datasetLoadMetadata.id}
            initialDatasetName={uploadedFile.name}
            initialDatasetId={datasetLoadMetadata.datasetId}
            rows={previewRows}
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
            loadCsvResult={datasetLoadMetadata}
            onRequestDataParse={async (parseConfig: {
              numRowsToSkip: number;
              delimiter: string;
            }) => {
              await LocalDatasetClient.dropLocalDataset({
                datasetId: datasetLoadMetadata.datasetId,
              });
              onRequestFileParse(uploadedFile);
              loadFile({
                file: uploadedFile,
                numRowsToSkip: parseConfig.numRowsToSkip,
                delimiter: parseConfig.delimiter,

                // generate a new dataset id for this new parsing
                datasetId: uuid() as Dataset.Id,
              });
            }}
            isProcessing={isLoadingFile}
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
