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
import type { ColumnCastWarning } from "./useColumnCastWarnings/useColumnCastWarnings";
import type { ImportedColumnsState } from "./useImportedColumns/useImportedColumns";
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

/** The labels and placeholders of the form's own fields. */
function useDatasetImportFieldProps(
  validation: ReturnType<typeof useDatasetImportValidation>,
): DatasetImportFieldsProps {
  const { t } = useLingui();
  return {
    ...validation,
    nameLabel: t`Dataset Name`,
    namePlaceholder: t`Enter a name for this dataset`,
    descriptionLabel: t`Description`,
    descriptionPlaceholder: t`Enter a description for this dataset`,
  };
}

/** Everything the feedback half of the form renders from. */
function _getFeedbackProps(
  options: Readonly<{
    formOptions: Readonly<DatasetImportFormStateOptions>;
    importedColumns: ImportedColumnsState;
    castWarnings: readonly ColumnCastWarning[];
    copy: DatasetImportFeedbackProps["copy"];
    previewRows: DatasetImportFeedbackProps["previewRows"];
    validation: DatasetImportFeedbackProps["validation"];
  }>,
): DatasetImportFeedbackProps {
  const { formOptions, importedColumns } = options;
  return {
    castWarnings: options.castWarnings,
    columnErrors: importedColumns.errors,
    columns: importedColumns.columns,
    copy: options.copy,
    dataSourceMetadata: formOptions.dataSourceMetadata,
    isProcessing: formOptions.isProcessing ?? false,
    onColumnChange:
      importedColumns.isEditable ? importedColumns.updateColumn : undefined,
    onDataSourceMetadataChange: formOptions.onDataSourceMetadataChange,
    onRequestDataReparse: formOptions.onRequestDataReparse,
    previewRows: options.previewRows,
    validation: options.validation,
  };
}

/** Saves the dataset, with the offline gate and validation wired in. */
function _getSubmitHandler(
  options: Readonly<{
    dataSourceMetadata: DatasetImportFormStateOptions["dataSourceMetadata"];
    columns: ImportedColumnsState["columns"];
    offline: ReturnType<typeof useOfflineGate>;
    saveDataset: ReturnType<typeof useSaveDataset>[0];
    validation: ReturnType<typeof useDatasetImportValidation>;
  }>,
): FormEventHandler<HTMLFormElement> {
  const { validation, offline, saveDataset } = options;
  return validation.form.onSubmit(
    offline.guard((values) => {
      saveDataset({
        ...values,
        ...options.dataSourceMetadata,
        columns: options.columns,
      });
    }),
    (errors) => {
      return validation.onValidationFailure(errors);
    },
  );
}

function useDatasetImportFormState(
  options: Readonly<DatasetImportFormStateOptions>,
): DatasetImportFormState {
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
  const fieldProps = useDatasetImportFieldProps(validation);
  const hasColumnErrors = importedColumns.errors.length > 0;

  return {
    fieldProps,
    feedbackProps: _getFeedbackProps({
      formOptions: options,
      importedColumns,
      castWarnings,
      copy,
      previewRows,
      validation,
    }),
    onSubmit: _getSubmitHandler({
      dataSourceMetadata: options.dataSourceMetadata,
      columns: importedColumns.columns,
      offline,
      saveDataset,
      validation,
    }),
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
