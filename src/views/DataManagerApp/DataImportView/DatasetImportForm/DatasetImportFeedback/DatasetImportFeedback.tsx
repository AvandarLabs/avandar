import { ColumnIssuesCallout } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/ColumnIssuesCallout";
import { DatasetPreview } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/DatasetPreview";
import { ErrorSummary } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/ErrorSummary";
import { ImportStatusCallout } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/ImportStatusCallout";
import { OnlineStorageAllowedCheckbox } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/OnlineStorageAllowedCheckbox";
import type { DatasetPreviewColumnEdit } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import type {
  DatasetImportFormProps,
  DataSourceMetadata,
} from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";
import type { ColumnCastWarning } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useColumnCastWarnings/useColumnCastWarnings";
import type { DatasetImportCopy } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportCopy";
import type { DatasetImportValidation } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useDatasetImportValidation";
import type { ImportedColumnError } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useImportedColumns/getImportedColumnErrors/getImportedColumnErrors";
import type { UnknownObject } from "@avandar/utils";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ReactNode } from "react";

export type DatasetImportFeedbackProps = {
  castWarnings: readonly ColumnCastWarning[];
  columnErrors: readonly ImportedColumnError[];
  columns: readonly DatasetColumn.Imported[];
  copy: DatasetImportCopy;
  dataSourceMetadata: DataSourceMetadata;
  isProcessing: boolean;

  /**
   * Omitted for sources whose columns this workspace does not own, which is
   * what renders the column table read-only.
   */
  onColumnChange:
    | ((columnIdx: number, edit: Readonly<DatasetPreviewColumnEdit>) => void)
    | undefined;
  onDataSourceMetadataChange: DatasetImportFormProps["onDataSourceMetadataChange"];
  onRequestDataReparse: DatasetImportFormProps["onRequestDataReparse"];
  previewRows: UnknownObject[];
  validation: DatasetImportValidation;
};

/**
 * Everything the form says back about the data it just parsed: whether the
 * parse worked, what it produced, where it may be stored, and what still needs
 * fixing before it can be saved.
 */
export function DatasetImportFeedback({
  castWarnings,
  columnErrors,
  columns,
  copy,
  dataSourceMetadata,
  isProcessing,
  onColumnChange,
  onDataSourceMetadataChange,
  onRequestDataReparse,
  previewRows,
  validation,
}: Readonly<DatasetImportFeedbackProps>): ReactNode {
  return (
    <>
      <ImportStatusCallout
        numRows={dataSourceMetadata.datasetLoadResult.numRows}
        failureMessage={copy.failureMessage}
        failureTitle={copy.failureTitle}
      />
      <DatasetPreview
        columns={columns}
        columnsMessage={copy.columnsMessage}
        dataSourceMetadata={dataSourceMetadata}
        isProcessing={isProcessing}
        onColumnChange={onColumnChange}
        onDataSourceMetadataChange={onDataSourceMetadataChange}
        onRequestDataReparse={onRequestDataReparse}
        previewMessage={copy.previewMessage}
        previewRows={previewRows}
      />
      <ColumnIssuesCallout
        errors={columnErrors}
        castWarnings={castWarnings}
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
