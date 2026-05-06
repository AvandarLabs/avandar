import { Box, BoxProps, Stack } from "@mantine/core";
import { notifyError } from "@ui/notifications/notify";
import { MIMEType } from "@utils/types/common.types";
import { uuid } from "$/lib/uuid";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { useState } from "react";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { FileUploadForm } from "@/lib/ui/singleton-forms/FileUploadForm";
import {
  DatasetImportForm,
  ManualUploadDataSourceMetadata,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import { useLoadManualUploadFile } from "@/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import { ManualUploadDropzone } from "./ManualUploadDropzone";
import type { ParseManualFileOptions } from "./useLoadManualUploadFile/useLoadManualUploadFile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = BoxProps;

function _fileMimeTypeToSourceType(file: File): "csv_file" | "xlsx_file" {
  const lowerFileName = file.name.toLowerCase();

  // Check for CSV MIME type or extension
  if (file.type.startsWith("text/csv") || lowerFileName.endsWith(".csv")) {
    return "csv_file";
  }

  // Check for XLSX MIME type or extension
  if (
    file.type === MIMEType.APPLICATION_OPENXML_EXCEL ||
    file.type === MIMEType.APPLICATION_MS_EXCEL ||
    lowerFileName.endsWith(".xlsx")
  ) {
    return "xlsx_file";
  }

  // fallback: just check file extension for .xlsx last
  if (lowerFileName.endsWith(".xlsx")) {
    return "xlsx_file";
  }

  // throw error if we found no match
  throw new Error(`Unsupported file type: ${file.type}`);
}

export function ManualUploadView(props: Props): JSX.Element {
  const [uploadedFile, setUploadedFile] = useState<File | undefined>();
  const {
    dataSourceMetadata,
    setDataSourceMetadata,
    previewRows,
    loadFile,
    isLoadingFile,
  } = useLoadManualUploadFile();

  const onRequestFileParse = async (params: {
    file: File;
    newDatasetId: Dataset.Id;
    datasetIdToDrop?: Dataset.Id;
    parseOptions?: ParseManualFileOptions;
  }) => {
    const { file, newDatasetId, datasetIdToDrop } = params;
    setUploadedFile(file);
    const parseOptionsToUse = params.parseOptions ?? {
      type: _fileMimeTypeToSourceType(file),
    };
    if (datasetIdToDrop) {
      await LocalDatasetClient.dropLocalDataset({ datasetId: datasetIdToDrop });
    }

    loadFile({
      ...parseOptionsToUse,
      file,
      datasetId: newDatasetId,
    });
  };

  const onFileSubmit = (file: File | undefined) => {
    if (file) {
      onRequestFileParse({ file, newDatasetId: uuid() as Dataset.Id });
    } else {
      notifyError({
        title: "No file selected",
        message: "Please select a file to import",
      });
    }
  };

  const elements = {
    importForm: () => {
      if (!previewRows || !uploadedFile || !dataSourceMetadata) {
        return null;
      }
      const {
        datasetLoadResult: { id, datasetId },
        parseOptions,
      } = dataSourceMetadata;
      return (
        <DatasetImportForm
          key={id}
          initialDatasetName={uploadedFile.name}
          rows={previewRows}
          dataSourceMetadata={dataSourceMetadata}
          parseOptions={parseOptions}
          onDataSourceMetadataChange={(metadata) => {
            setDataSourceMetadata(metadata as ManualUploadDataSourceMetadata);
          }}
          isProcessing={isLoadingFile}
          onRequestDataReparse={async () => {
            if (!DatasetSource.isManuallyUploadable(parseOptions)) {
              // this should never happen in this code path
              return;
            }

            onRequestFileParse({
              file: uploadedFile,
              datasetIdToDrop: datasetId,
              newDatasetId: uuid() as Dataset.Id,
              parseOptions,
            });
          }}
        />
      );
    },
  };

  return (
    <Box {...props}>
      <Stack align="flex-start">
        <FileUploadForm
          label="Upload an Excel file or CSV"
          description="Select an Excel file or CSV from your computer to import"
          placeholder="Select file"
          accept={[
            MIMEType.TEXT_CSV,
            MIMEType.APPLICATION_MS_EXCEL,
            MIMEType.APPLICATION_OPENXML_EXCEL,
          ]}
          fullWidth
          isSubmitting={isLoadingFile}
          onSubmit={onFileSubmit}
        />

        {elements.importForm()}

        <ManualUploadDropzone
          onRequestFileParse={(file) => {
            onRequestFileParse({
              file,
              newDatasetId: uuid() as Dataset.Id,
            });
          }}
        />
      </Stack>
    </Box>
  );
}
