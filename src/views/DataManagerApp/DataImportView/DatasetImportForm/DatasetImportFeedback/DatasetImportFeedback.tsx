import { Stack } from "@mantine/core";
import { DatasetPreview } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/DatasetPreview";
import { ImportStatusCallout } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/ImportStatusCallout";
import { isPdfAwaitingSelection } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/isPdfAwaitingSelection";
import type {
  DatasetImportFormProps,
  DataSourceMetadata,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { DatasetImportCopy } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportCopy";
import type { useImportedColumns } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useImportedColumns/useImportedColumns";
import type { UnknownObject } from "@avandar/utils";
import type { ReactNode } from "react";

export type DatasetImportFeedbackProps = {
  columns: ReturnType<typeof useImportedColumns>;
  copy: DatasetImportCopy;
  dataSourceMetadata: DataSourceMetadata;
  isProcessing: boolean;
  onDataSourceMetadataChange: DatasetImportFormProps["onDataSourceMetadataChange"];
  onRequestDataReparse: DatasetImportFormProps["onRequestDataReparse"];
  previewRows: UnknownObject[];
  sourceFile?: File;
};

/**
 * What the parse produced: whether it worked, and what came out of it.
 *
 * The storage choice and the save action used to live here too. They belong
 * with the decision to keep the dataset, not with the evidence for it, so
 * they moved to the form's action bar.
 */
export function DatasetImportFeedback({
  columns,
  copy,
  dataSourceMetadata,
  isProcessing,
  onDataSourceMetadataChange,
  onRequestDataReparse,
  previewRows,
  sourceFile,
}: Readonly<DatasetImportFeedbackProps>): ReactNode {
  return (
    <Stack gap="xl">
      {/*
        `numRows === 0` normally means the parse failed. For a PDF with no
        region picked yet it means the user has not told us what to read, so
        the callout is withheld and `DatasetPreview` explains what to do
        instead.
      */}
      {isPdfAwaitingSelection(dataSourceMetadata) ? null : (
        <ImportStatusCallout
          numRows={dataSourceMetadata.datasetLoadResult.numRows}
          failureMessage={copy.failureMessage}
          failureTitle={copy.failureTitle}
        />
      )}
      <DatasetPreview
        columns={columns}
        columnsMeta={copy.columnsMeta}
        dataSourceMetadata={dataSourceMetadata}
        isProcessing={isProcessing}
        onDataSourceMetadataChange={onDataSourceMetadataChange}
        onRequestDataReparse={onRequestDataReparse}
        previewMeta={copy.previewMeta}
        previewRows={previewRows}
        sourceFile={sourceFile}
      />
    </Stack>
  );
}
