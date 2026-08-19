import { FileUploadForm } from "@avandar/ui";
import { MIMEType } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Box, BoxProps, Stack } from "@mantine/core";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { DatasetImportForm } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm";
import { ManualUploadDataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import { useManualUploadParse } from "@/views/DataManagerApp/DataImportView/ManualUploadView/useManualUploadParse/useManualUploadParse";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { ManualUploadParse } from "@/views/DataManagerApp/DataImportView/ManualUploadView/useManualUploadParse/useManualUploadParse";
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

type ManualUploadImportFormProps = {
  uploadedFile: File;
  previewRows: UnknownRow[];
  dataSourceMetadata: ManualUploadDataSourceMetadata;
  isReparsePending: boolean;
  onAfterSave?: () => void;
  onSaveSuccess?: (dataset: Dataset.T) => void;
  onRequestDataReparse: ManualUploadParse["onRequestDataReparse"];
  setDataSourceMetadata: ManualUploadParse["setDataSourceMetadata"];
};

function _ManualUploadImportForm(
  props: Readonly<ManualUploadImportFormProps>,
): ReactNode {
  const {
    uploadedFile,
    previewRows,
    dataSourceMetadata,
    isReparsePending,
    onAfterSave,
    onSaveSuccess,
    onRequestDataReparse,
    setDataSourceMetadata,
  } = props;
  return (
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
        setDataSourceMetadata(metadata);
      }}
      isProcessing={isReparsePending}
      onAfterSave={(savedDataset) => {
        NuxEvents.emit("dataset.saved", { datasetId: savedDataset.id });
        onAfterSave?.();
      }}
      onRequestDataReparse={onRequestDataReparse}
    />
  );
}

/**
 * Spreadsheet picker plus the dataset import form after a file is sniffed.
 */
export function ManualUploadView({
  initialFile,
  onAfterSave,
  onSaveSuccess,
  ...boxProps
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const manualUpload = useManualUploadParse(initialFile);
  const { uploadedFile, previewRows, dataSourceMetadata } = manualUpload;

  return (
    <Box {...boxProps}>
      <Stack align="flex-start">
        <Box {...NuxAnchors.props(NuxAnchors.ids.datasetUploadForm)}>
          <FileUploadForm
            label={t`Upload a file`}
            description={t`Select an Excel, CSV or PDF file from your computer to import`}
            placeholder={t`Select file`}
            accept={[
              MIMEType.TEXT_CSV,
              MIMEType.APPLICATION_MS_EXCEL,
              MIMEType.APPLICATION_OPENXML_EXCEL,
              MIMEType.APPLICATION_PDF,
            ]}
            fullWidth
            isSubmitting={
              manualUpload.isLoadingFile && previewRows === undefined
            }
            onSubmit={manualUpload.onFileSubmit}
          />
        </Box>
        {previewRows && uploadedFile && dataSourceMetadata ?
          <_ManualUploadImportForm
            uploadedFile={uploadedFile}
            previewRows={previewRows}
            dataSourceMetadata={dataSourceMetadata}
            isReparsePending={manualUpload.isReparsePending}
            onAfterSave={onAfterSave}
            onSaveSuccess={onSaveSuccess}
            onRequestDataReparse={manualUpload.onRequestDataReparse}
            setDataSourceMetadata={manualUpload.setDataSourceMetadata}
          />
        : null}
      </Stack>
    </Box>
  );
}
