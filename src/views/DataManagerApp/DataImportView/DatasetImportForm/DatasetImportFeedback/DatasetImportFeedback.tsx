import { DatasetPreview } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/DatasetPreview";
import { ErrorSummary } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/ErrorSummary";
import { ImportStatusCallout } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/ImportStatusCallout";
import { OnlineStorageAllowedCheckbox } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/OnlineStorageAllowedCheckbox";
import { isPdfAwaitingSelection } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/isPdfAwaitingSelection";
import type {
  DatasetImportFormProps,
  DataSourceMetadata,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { DatasetImportCopy } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportCopy";
import type { DatasetImportValidation } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportValidation";
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
  validation: DatasetImportValidation;
};

/**
 * Everything the form says back about the data it just parsed: whether the
 * parse worked, what it produced, where it may be stored, and what still needs
 * fixing before it can be saved.
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
  validation,
}: Readonly<DatasetImportFeedbackProps>): ReactNode {
  return (
    <>
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
        columnsMessage={copy.columnsMessage}
        dataSourceMetadata={dataSourceMetadata}
        isProcessing={isProcessing}
        onDataSourceMetadataChange={onDataSourceMetadataChange}
        onRequestDataReparse={onRequestDataReparse}
        previewMessage={copy.previewMessage}
        previewRows={previewRows}
        sourceFile={sourceFile}
      />
      <OnlineStorageAllowedCheckbox
        dataSourceMetadata={dataSourceMetadata}
        offlineOnlyTitle={copy.offlineOnlyTitle}
        onChange={onDataSourceMetadataChange}
      />
      <ErrorSummary
        isVisible={validation.isFormErrorSummaryVisible}
        items={validation.formErrorSummaryItems}
        title={copy.errorTitle}
        message={copy.errorMessage}
      />
    </>
  );
}
