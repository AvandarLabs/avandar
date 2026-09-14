import { isDefined } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Box, BoxProps, Stack, Text } from "@mantine/core";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import { FileDropzone } from "@/views/DataManagerApp/DataImportView/ManualUploadView/FileDropzone/FileDropzone";
import { UploadedFileBar } from "@/views/DataManagerApp/DataImportView/ManualUploadView/UploadedFileBar/UploadedFileBar";
import { useManualUploadParse } from "@/views/DataManagerApp/DataImportView/ManualUploadView/useManualUploadParse/useManualUploadParse";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

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

/**
 * The manual import flow: choose a file, then review and name what came out
 * of it.
 *
 * The file target and the review form occupy the same place in the layout
 * one after the other, so the view always has exactly one thing to do next.
 */
export function ManualUploadView({
  initialFile,
  onAfterSave,
  onSaveSuccess,
  ...boxProps
}: Readonly<Props>): ReactNode {
  const manualUpload = useManualUploadParse(initialFile);
  const { uploadedFile, previewRows, dataSourceMetadata } = manualUpload;
  const hasParsedFile =
    isDefined(previewRows) &&
    isDefined(uploadedFile) &&
    isDefined(dataSourceMetadata);

  return (
    <Box {...boxProps}>
      <Stack gap="xl">
        <Box {...NuxAnchors.props(NuxAnchors.ids.datasetUploadForm)}>
          {hasParsedFile ? (
            <UploadedFileBar
              file={uploadedFile}
              sourceType={dataSourceMetadata.sourceType}
              isBusy={manualUpload.isLoadingFile}
              onReplace={manualUpload.onFileSubmit}
            />
          ) : (
            <Stack gap="xs">
              <FileDropzone
                isLoading={manualUpload.isLoadingFile}
                onSelect={manualUpload.onFileSubmit}
              />
              {/*
                Where the file is read is a real question for a team handling
                sensitive data, and the answer is a selling point rather than
                a disclaimer. It sits under the target because that is the
                moment the question comes up.
              */}
              <Text size="xs" c="dimmed">
                <Trans>
                  Avandar reads the file in your browser. Nothing leaves this
                  device until you save the dataset.
                </Trans>
              </Text>
            </Stack>
          )}
        </Box>

        {hasParsedFile ? (
          <DatasetImportForm
            key={dataSourceMetadata.datasetLoadResult.id}
            initialDatasetName={uploadedFile.name}
            sourceFile={uploadedFile}
            rows={previewRows}
            dataSourceMetadata={dataSourceMetadata}
            parseOptions={dataSourceMetadata.parseOptions}
            onSaveSuccess={onSaveSuccess}
            onDataSourceMetadataChange={(metadata) => {
              if (!DatasetSource.isManuallyUploadable(metadata)) {
                return;
              }
              manualUpload.setDataSourceMetadata(metadata);
            }}
            isProcessing={manualUpload.isReparsePending}
            onAfterSave={(savedDataset) => {
              NuxEvents.emit("dataset.saved", { datasetId: savedDataset.id });
              onAfterSave?.();
            }}
            onRequestDataReparse={manualUpload.onRequestDataReparse}
          />
        ) : null}
      </Stack>
    </Box>
  );
}
