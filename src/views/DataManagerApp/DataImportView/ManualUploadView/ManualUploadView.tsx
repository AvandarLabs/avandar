import { Box, BoxProps, Stack } from "@mantine/core";
import { FileUploadForm, notifyError } from "@ui";
import { MIMEType } from "@utils";
import { uuid } from "$/lib/uuid";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { useEffect, useRef, useState } from "react";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import {
  DatasetImportForm,
  ManualUploadDataSourceMetadata,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import { useLoadManualUploadFile } from "@/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type { ParseManualFileOptions } from "./useLoadManualUploadFile/useLoadManualUploadFile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = BoxProps & {
  /**
   * A file to auto-parse on mount. Used when the import flow is launched
   * by dropping a file onto the app-wide dropzone.
   */
  initialFile?: File;

  /**
   * Called after the dataset save mutation completes successfully.
   * Used by the app-wide import modal to close itself.
   */
  onAfterSave?: () => void;

  /**
   * When set, this callback is invoked with the newly saved dataset instead
   * of the default navigation to the dataset detail page.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

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

export function ManualUploadView({
  initialFile,
  onAfterSave,
  onSaveSuccess,
  ...boxProps
}: Props): JSX.Element {
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

  // When an `initialFile` is supplied (e.g. dropped onto the app-wide
  // dropzone), start parsing it on mount so the user lands directly
  // on the import form without an extra click.
  const hasAutoParsedInitialFileRef = useRef(false);
  useEffect(() => {
    if (!initialFile || hasAutoParsedInitialFileRef.current) {
      return;
    }
    hasAutoParsedInitialFileRef.current = true;
    void onRequestFileParse({
      file: initialFile,
      newDatasetId: uuid() as Dataset.Id,
    });
    // We intentionally exclude `onRequestFileParse` from deps - it
    // changes on every render but the ref guards single execution.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

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
          onSaveSuccess={onSaveSuccess}
          onDataSourceMetadataChange={(metadata) => {
            setDataSourceMetadata(metadata as ManualUploadDataSourceMetadata);
          }}
          isProcessing={isLoadingFile}
          onAfterSave={onAfterSave}
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
    <Box {...boxProps}>
      <Stack align="flex-start">
        <FileUploadForm
          label="Upload a spreadsheet"
          description="Select an Excel or CSV file from your computer to import"
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
      </Stack>
    </Box>
  );
}
