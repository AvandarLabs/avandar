import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { useMemo } from "react";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import { DatasetImportFeedback } from "./DatasetImportFeedback/DatasetImportFeedback";
import { DatasetImportFields } from "./DatasetImportFields";
import { SaveDatasetButton } from "./SaveDatasetButton";
import { useColumnCastWarnings } from "./useColumnCastWarnings/useColumnCastWarnings";
import { useDatasetImportCopy } from "./useDatasetImportCopy";
import { useDatasetImportValidation } from "./useDatasetImportValidation";
import { useImportedColumns } from "./useImportedColumns/useImportedColumns";
import { useSaveDataset } from "./useSaveDataset/useSaveDataset";
import type { DatasetImportFeedbackProps } from "./DatasetImportFeedback/DatasetImportFeedback";
import type { DatasetImportFieldsProps } from "./DatasetImportFields";
import type { DatasetImportFormProps } from "./DatasetImportForm.types";
import type { SaveDatasetButtonProps } from "./SaveDatasetButton";
import type { FormEventHandler, ReactNode } from "react";

/**
 * Everything `DatasetImportForm` needs from its props. The two props it never
 * reads (`showOnlineStorageAllowed`, whose job the source type already
 * answers, and `parseOptions`, which arrives inside `dataSourceMetadata`) are
 * omitted so the state hook cannot start depending on them by accident.
 */
type DatasetImportFormStateOptions = Omit<
  DatasetImportFormProps,
  "showOnlineStorageAllowed" | "parseOptions"
>;

type DatasetImportFormState = {
  feedbackProps: DatasetImportFeedbackProps;
  fieldProps: DatasetImportFieldsProps;
  onSubmit: FormEventHandler<HTMLFormElement>;
  saveButtonProps: SaveDatasetButtonProps;
};

function useDatasetImportFormState(
  options: Readonly<DatasetImportFormStateOptions>,
): DatasetImportFormState {
  const { t } = useLingui();
  const validation = useDatasetImportValidation(options.initialDatasetName);
  const importedColumns = useImportedColumns(options.dataSourceMetadata);
  const [saveDataset, isSavePending] = useSaveDataset({
    onAfterSave: options.onAfterSave,
    onSaveSuccess: options.onSaveSuccess,
  });
  const offline = useOfflineGate();
  const previewRows = useMemo(() => {
    return options.rows.slice(0, GlobalAppConfig.dataManagerApp.maxPreviewRows);
  }, [options.rows]);
  const castWarnings = useColumnCastWarnings({
    columns: importedColumns.columns,
    previewRows,
  });
  const copy = useDatasetImportCopy({
    numColumns: importedColumns.columns.length,
    numPreviewRows: previewRows.length,
  });
  const hasColumnErrors = importedColumns.errors.length > 0;

  return {
    fieldProps: {
      ...validation,
      nameLabel: t`Dataset Name`,
      namePlaceholder: t`Enter a name for this dataset`,
      descriptionLabel: t`Description`,
      descriptionPlaceholder: t`Enter a description for this dataset`,
    },
    feedbackProps: {
      castWarnings,
      columnErrors: importedColumns.errors,
      columns: importedColumns.columns,
      copy,
      dataSourceMetadata: options.dataSourceMetadata,
      isProcessing: options.isProcessing ?? false,
      onColumnChange:
        importedColumns.isEditable ? importedColumns.updateColumn : undefined,
      onDataSourceMetadataChange: options.onDataSourceMetadataChange,
      onRequestDataReparse: options.onRequestDataReparse,
      previewRows,
      validation,
    },
    onSubmit: validation.form.onSubmit(
      offline.guard((values) => {
        saveDataset({
          ...values,
          ...options.dataSourceMetadata,
          columns: importedColumns.columns,
        });
      }),
      (errors) => {
        return validation.onValidationFailure(errors);
      },
    ),
    saveButtonProps: {
      // A duplicate or empty column name would not fail loudly: DuckDB would
      // build the dataset's view anyway and quietly make a column unreadable.
      disableSubmit: options.disableSubmit || hasColumnErrors,
      isOfflineBlocked: offline.isBlocked,
      isSavePending,
    },
  };
}

/**
 * This is the common form that shows up after a user has uploaded or connected
 * a data source. This is where the user can adjust settings, re-connect or
 * re-parse the data, preview the data, and (ultimately) finally save the
 * data source to their workspace.
 */
export function DatasetImportForm({
  rows,
  initialDatasetName,
  disableSubmit,
  onRequestDataReparse,
  isProcessing,
  onDataSourceMetadataChange,
  dataSourceMetadata,
  onAfterSave,
  onSaveSuccess,
}: Readonly<DatasetImportFormProps>): ReactNode {
  const state = useDatasetImportFormState({
    rows,
    initialDatasetName,
    disableSubmit,
    onRequestDataReparse,
    isProcessing,
    onDataSourceMetadataChange,
    dataSourceMetadata,
    onAfterSave,
    onSaveSuccess,
  });

  return (
    <form onSubmit={state.onSubmit}>
      <Stack>
        <DatasetImportFields {...state.fieldProps} />
        <DatasetImportFeedback {...state.feedbackProps} />
        <SaveDatasetButton {...state.saveButtonProps} />
      </Stack>
    </form>
  );
}
