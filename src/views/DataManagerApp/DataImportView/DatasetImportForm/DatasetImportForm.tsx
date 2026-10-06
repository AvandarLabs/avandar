import { Trans, useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { useMemo } from "react";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import { DatasetImportActions } from "./DatasetImportActions/DatasetImportActions";
import { DatasetImportFeedback } from "./DatasetImportFeedback/DatasetImportFeedback";
import { DatasetImportFields } from "./DatasetImportFields";
import { isPdfAwaitingSelection } from "./isPdfAwaitingSelection";
import { useDatasetImportCopy } from "./useDatasetImportCopy";
import { useDatasetImportValidation } from "./useDatasetImportValidation";
import { useImportedColumns } from "./useImportedColumns/useImportedColumns";
import { useSaveDataset } from "./useSaveDataset/useSaveDataset";
import type { Props as DatasetImportActionsProps } from "./DatasetImportActions/DatasetImportActions";
import type { DatasetImportFeedbackProps } from "./DatasetImportFeedback/DatasetImportFeedback";
import type { DatasetImportFieldsProps } from "./DatasetImportFields";
import type { DatasetImportFormProps } from "./DatasetImportForm.types";
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
  actionProps: DatasetImportActionsProps;
  feedbackProps: DatasetImportFeedbackProps;
  fieldProps: DatasetImportFieldsProps;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

function useDatasetImportFormState(
  options: Readonly<DatasetImportFormStateOptions>,
): DatasetImportFormState {
  const { t } = useLingui();
  const validation = useDatasetImportValidation(options.initialDatasetName);
  const columns = useImportedColumns(options.dataSourceMetadata);
  const [saveDataset, isSavePending] = useSaveDataset({
    onAfterSave: options.onAfterSave,
    onSaveSuccess: options.onSaveSuccess,
  });
  const offline = useOfflineGate();
  const previewRows = useMemo(() => {
    return options.rows.slice(0, GlobalAppConfig.dataManagerApp.maxPreviewRows);
  }, [options.rows]);
  const copy = useDatasetImportCopy({
    numColumns: columns.length,
    numPreviewRows: previewRows.length,
  });

  return {
    fieldProps: {
      ...validation,
      nameLabel: t`Dataset name`,
      namePlaceholder: t`Enter a name for this dataset`,
      descriptionLabel: t`Description`,
      descriptionPlaceholder: t`What is in this dataset?`,
    },
    feedbackProps: {
      columns,
      copy,
      dataSourceMetadata: options.dataSourceMetadata,
      isProcessing: options.isProcessing ?? false,
      onDataSourceMetadataChange: options.onDataSourceMetadataChange,
      onRequestDataReparse: options.onRequestDataReparse,
      previewRows,
      sourceFile: options.sourceFile,
    },
    onSubmit: validation.form.onSubmit(
      offline.guard((values) => {
        saveDataset({ ...values, ...options.dataSourceMetadata });
      }),
      (errors) => {
        return validation.onValidationFailure(errors);
      },
    ),
    actionProps: {
      copy,
      dataSourceMetadata: options.dataSourceMetadata,
      // Saving a PDF with no region picked would write a dataset with no
      // columns and no rows, so the button stays disabled until there is
      // something to save.
      disableSubmit:
        options.disableSubmit ||
        isPdfAwaitingSelection(options.dataSourceMetadata),
      isOfflineBlocked: offline.isBlocked,
      isSavePending,
      onDataSourceMetadataChange: options.onDataSourceMetadataChange,
      validation,
    },
  };
}

/**
 * This is the common form that shows up after a user has uploaded or connected
 * a data source. This is where the user can adjust settings, re-connect or
 * re-parse the data, preview the data, and (ultimately) finally save the
 * data source to their workspace.
 *
 * It reads top to bottom as the decision it is: name the thing, check what
 * came out of the file, then keep it. The evidence sections carry no chrome
 * of their own beyond a ruled heading, so the preview grid and the column
 * table get the full width of the view.
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
  sourceFile,
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
    sourceFile,
  });

  return (
    <form
      {...NuxAnchors.props(NuxAnchors.ids.datasetImportForm)}
      onSubmit={state.onSubmit}
    >
      <Stack gap="xl">
        <AppViewSection title={<Trans>Dataset details</Trans>}>
          <DatasetImportFields {...state.fieldProps} />
        </AppViewSection>
        <DatasetImportFeedback {...state.feedbackProps} />
        <DatasetImportActions {...state.actionProps} />
      </Stack>
    </form>
  );
}
