import { isDefined } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Box, BoxProps, Stack, Text } from "@mantine/core";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import { FileDropzone } from "@/views/DataManagerApp/DataImportView/ManualUploadView/FileDropzone/FileDropzone";
import { FileUrlChoice } from "@/views/DataManagerApp/DataImportView/ManualUploadView/FileUrlChoice/FileUrlChoice";
import { FileUrlField } from "@/views/DataManagerApp/DataImportView/ManualUploadView/FileUrlField/FileUrlField";
import { UploadedFileBar } from "@/views/DataManagerApp/DataImportView/ManualUploadView/UploadedFileBar/UploadedFileBar";
import { useFileUrlImport } from "@/views/DataManagerApp/DataImportView/ManualUploadView/useFileUrlImport/useFileUrlImport";
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
 * The manual import flow: choose a file or paste a link, then review and
 * name what came out of it.
 *
 * The file target and the review form occupy the same place in the layout
 * one after the other, so the view always has exactly one thing to do next.
 * A pasted link is downloaded and then reviewed as a dropped file. The link
 * is not kept.
 */
export function ManualUploadView({
  initialFile,
  onAfterSave,
  onSaveSuccess,
  ...boxProps
}: Readonly<Props>): ReactNode {
  const manualUpload = useManualUploadParse(initialFile);
  const fileUrl = useFileUrlImport(manualUpload.onFileSubmit);
  const { uploadedFile, previewRows, dataSourceMetadata } = manualUpload;
  const hasParsedFile =
    isDefined(previewRows) &&
    isDefined(uploadedFile) &&
    isDefined(dataSourceMetadata);
  const isAcquiring = manualUpload.isLoadingFile || fileUrl.phase === "fetching";
  const isChoosingFile = !hasParsedFile && fileUrl.members.length > 0;

  return (
    <Box {...boxProps}>
      <Stack gap="xl">
        <Box {...NuxAnchors.props(NuxAnchors.ids.datasetUploadForm)}>
          {hasParsedFile ? (
            <UploadedFileBar
              file={uploadedFile}
              sourceType={dataSourceMetadata.sourceType}
              isBusy={isAcquiring}
              onReplace={manualUpload.onFileSubmit}
              onUseLink={() => {
                manualUpload.clearParsedFile();
                fileUrl.returnToLink();
              }}
            />
          ) : isChoosingFile ? (
            <FileUrlChoice
              members={fileUrl.members}
              errorMessage={fileUrl.errorMessage}
              isBusy={fileUrl.phase === "fetching"}
              onChoose={fileUrl.chooseMember}
              onUseDifferentLink={fileUrl.returnToLink}
            />
          ) : (
            <Stack gap="sm">
              <FileDropzone
                isLoading={isAcquiring}
                onSelect={manualUpload.onFileSubmit}
              />
              <FileUrlField
                url={fileUrl.url}
                errorMessage={fileUrl.errorMessage}
                isBusy={isAcquiring}
                status={fileUrl.status}
                fieldRef={fileUrl.fieldRef}
                onUrlChange={fileUrl.setUrl}
                onSubmit={fileUrl.submitUrl}
              />
              {/*
                Where the bytes are read is a real question for a team
                handling sensitive data. A dropped file never leaves the
                device until save. A pasted link is downloaded by Avandar
                first, then read here the same way.
              */}
              <Text size="xs" c="dimmed">
                <Trans>
                  A file you drop stays on this device until you save. A link
                  is downloaded by Avandar first, then read here the same way.
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
