import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Checkbox, Group, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { useMemo, useRef, useState } from "react";
import { DatasetPreviewBlock } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import { notifyError } from "@/utils/notifications/notify";
import classes from "./DatasetImportForm.module.css";
import { DatasetParseControls } from "./DatasetParseControls";
import { useImportedColumns } from "./useImportedColumns/useImportedColumns";
import { useSaveDataset } from "./useSaveDataset/useSaveDataset";
import type {
  CsvFileLoadResult,
  XlsxFileLoadResult,
} from "../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import type {
  CsvParseOptions,
  FileParseOptions,
  GoogleSheetsParseOptions,
  XlsxParseOptions,
} from "./useSaveDataset/useSaveDataset";
import type { DuckDbLoadCsvResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { UnknownObject } from "@avandar/utils";
import type { FormErrors, UseFormReturnType } from "@mantine/form";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { FormEventHandler, RefObject } from "react";

export type DatasetImportFormValues = {
  name: string;
  description: string;
};

export type XlsxDataSourceMetadata = {
  sourceType: "xlsx_file";
  onlineStorageAllowed: boolean;
  sizeInBytes: number;

  /** Metadata we extracted during the parsing and loading process */
  datasetLoadResult: XlsxFileLoadResult;

  /**
   * Options used to parse the XLSX. Used in case we need to re-parse and
   * reload the data.
   */
  parseOptions: XlsxParseOptions;
};

export type CsvDataSourceMetadata = {
  sourceType: "csv_file";
  onlineStorageAllowed: boolean;
  sizeInBytes: number;

  /** Metadata we extracted during the parsing and loading process */
  datasetLoadResult: CsvFileLoadResult;

  /**
   * Options used to parse the CSV. Used in case we need to re-parse and
   * reload the data.
   */
  parseOptions: CsvParseOptions;
};

export type ManualUploadDataSourceMetadata =
  | XlsxDataSourceMetadata
  | CsvDataSourceMetadata;

export type BaseLoadResult = {
  datasetId: Dataset.Id;
  numRows: number;
};

export type GoogleSheetsLoadResult = BaseLoadResult & {
  rawText: string;
  sheetLoadMetadata: DuckDbLoadCsvResult;
  spreadsheetName: string;
};

export type GoogleSheetsDataSourceMetadata = {
  sourceType: "google_sheets";
  googleDocumentId: string;
  googleAccountId: string;
  datasetLoadResult: GoogleSheetsLoadResult;

  /**
   * Options used to parse and load the Google Sheets. Used in case we ever
   * need to re-parse and reload the data.
   */
  parseOptions: GoogleSheetsParseOptions;
};

export type DataSourceMetadata =
  | XlsxDataSourceMetadata
  | CsvDataSourceMetadata
  | GoogleSheetsDataSourceMetadata;

const { maxDatasetNameLength, maxDatasetDescriptionLength } =
  GlobalAppConfig.dataManagerApp;

const VALIDATION_FIELD_ORDER = ["name", "description"] as const;

type ValidationField = (typeof VALIDATION_FIELD_ORDER)[number];

type Props = {
  /**
   * Regardless of how many rows are passed in, only the first
   * `GlobalAppConfig.dataManagerApp.maxPreviewRows` will be displayed.
   */
  rows: readonly UnknownObject[];
  initialDatasetName: string;
  disableSubmit?: boolean;

  /** When the user requests to parse the data again. */
  onRequestDataReparse: (parseOptions: FileParseOptions) => void;
  isProcessing?: boolean;

  /**
   * When the user changes the data source metadata, such as the parse options.
   */
  onDataSourceMetadataChange: (options: DataSourceMetadata) => void;

  /**
   * If true, show the "cloud storage" toggle which can mark the dataset as
   * offline-only.
   */
  showOnlineStorageAllowed?: boolean;

  /** Source-specific metadata used when persisting the dataset. */
  dataSourceMetadata: DataSourceMetadata;

  /** The parse options for the dataset. This is a controlled component. */
  parseOptions: FileParseOptions;

  /**
   * Optional callback fired after the dataset is saved successfully.
   * Used by the app-wide import modal to close itself before the
   * default post-save navigation runs.
   */
  onAfterSave?: () => void;

  /**
   * If set, this callback is invoked with the saved dataset instead of
   * navigating to the dataset detail page on success. Forwarded to
   * `useSaveDataset`.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

type RenderDatasetFieldsOptions = {
  descriptionInputRef: RefObject<HTMLInputElement | null>;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  form: UseFormReturnType<DatasetImportFormValues>;
  nameInputRef: RefObject<HTMLInputElement | null>;
  nameLabel: string;
  namePlaceholder: string;
};

type RenderDatasetPreviewOptions = {
  columns: ReturnType<typeof useImportedColumns>;
  columnsMessage: string;
  dataSourceMetadata: DataSourceMetadata;
  isProcessing: boolean;
  onDataSourceMetadataChange: Props["onDataSourceMetadataChange"];
  onRequestDataReparse: Props["onRequestDataReparse"];
  previewMessage: string;
  previewRows: UnknownObject[];
};

type RenderErrorSummaryOptions = {
  isVisible: boolean;
  items: readonly FormErrorSummaryItem[];
  message: string;
  title: string;
};

type NotifyInvalidFieldOptions = {
  descriptionInputRef: RefObject<HTMLInputElement | null>;
  errors: Readonly<FormErrors>;
  fallbackMessage: string;
  nameInputRef: RefObject<HTMLInputElement | null>;
  title: string;
};

type FormErrorSummaryItem = {
  field: ValidationField;
  line: string;
};

type DatasetImportValidation = {
  descriptionInputRef: RefObject<HTMLInputElement | null>;
  form: UseFormReturnType<DatasetImportFormValues>;
  formErrorSummaryItems: FormErrorSummaryItem[];
  isFormErrorSummaryVisible: boolean;
  nameInputRef: RefObject<HTMLInputElement | null>;
  onValidationFailure: (errors: Readonly<FormErrors>) => void;
};

type RenderImportStatusOptions = {
  failureMessage: string;
  failureTitle: string;
  numRows: number;
  successMessage: string;
  successTitle: string;
};

function useErrorMessageForField(): (
  options: Readonly<{ field: ValidationField; value: string }>,
) => string | undefined {
  const { t } = useLingui();
  return ({ field, value }) => {
    if (field === "name") {
      return value.length < maxDatasetNameLength ?
          undefined
        : t`Dataset name must be under ${maxDatasetNameLength} characters (current: ${value.length}).`;
    }

    return value.length < maxDatasetDescriptionLength ?
        undefined
      : t`Description must be under ${maxDatasetDescriptionLength} characters (current: ${value.length}).`;
  };
}

function _getFirstInvalidField(
  errors: Readonly<FormErrors>,
): ValidationField | undefined {
  return VALIDATION_FIELD_ORDER.find((field) => {
    return Boolean(errors[field]);
  });
}

function _getFormErrorSummaryItems(
  options: Readonly<{
    descriptionLabel: string;
    errors: Readonly<FormErrors>;
    nameLabel: string;
  }>,
): FormErrorSummaryItem[] {
  return VALIDATION_FIELD_ORDER.flatMap((field) => {
    const error = options.errors[field];
    if (!error) {
      return [];
    }
    const label =
      field === "name" ? options.nameLabel : options.descriptionLabel;
    return [{ field, line: `${label}: ${String(error)}` }];
  });
}

function _notifyAndFocusFirstInvalidField(
  options: Readonly<NotifyInvalidFieldOptions>,
): void {
  const field = _getFirstInvalidField(options.errors);
  if (!field) {
    return;
  }
  notifyError({
    title: options.title,
    message:
      typeof options.errors[field] === "string" ?
        options.errors[field]
      : options.fallbackMessage,
  });
  const node = (
    field === "name" ?
      options.nameInputRef
    : options.descriptionInputRef).current;
  node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  node?.focus({ preventScroll: true });
}

function useDatasetImportValidation(
  initialDatasetName: string,
): DatasetImportValidation {
  const { t } = useLingui();
  const errorMessageForField = useErrorMessageForField();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const [isFormErrorSummaryVisible, setIsFormErrorSummaryVisible] =
    useState(false);
  const form = useForm<DatasetImportFormValues>({
    initialValues: { name: initialDatasetName, description: "" },
    validateInputOnChange: true,
    validate: {
      name: (value) => {
        return errorMessageForField({ field: "name", value });
      },
      description: (value) => {
        return errorMessageForField({ field: "description", value });
      },
    },
  });
  const onValidationFailure = (errors: Readonly<FormErrors>): void => {
    setIsFormErrorSummaryVisible(true);
    _notifyAndFocusFirstInvalidField({
      descriptionInputRef,
      errors,
      fallbackMessage: t`Please fix the highlighted fields.`,
      nameInputRef,
      title: t`Can't save dataset`,
    });
  };
  return {
    descriptionInputRef,
    form,
    formErrorSummaryItems: _getFormErrorSummaryItems({
      descriptionLabel: t`Description`,
      errors: form.errors,
      nameLabel: t`Dataset name`,
    }),
    isFormErrorSummaryVisible,
    nameInputRef,
    onValidationFailure,
  };
}

function _renderDatasetFields(
  options: Readonly<RenderDatasetFieldsOptions>,
): JSX.Element {
  return (
    <>
      <TextInput
        ref={options.nameInputRef}
        key={options.form.key("name")}
        label={options.nameLabel}
        placeholder={options.namePlaceholder}
        required
        {...options.form.getInputProps("name")}
      />
      <TextInput
        ref={options.descriptionInputRef}
        key={options.form.key("description")}
        label={options.descriptionLabel}
        placeholder={options.descriptionPlaceholder}
        {...options.form.getInputProps("description")}
      />
    </>
  );
}

function _renderImportStatus(
  options: Readonly<RenderImportStatusOptions>,
): JSX.Element {
  return options.numRows === 0 ?
      <Callout
        title={options.failureTitle}
        color="error"
        message={options.failureMessage}
      />
    : <Callout
        title={options.successTitle}
        color="success"
        message={options.successMessage}
      />;
}

function _renderDatasetPreview(
  options: Readonly<RenderDatasetPreviewOptions>,
): JSX.Element {
  return (
    <DatasetPreviewBlock
      previewRows={options.previewRows}
      columns={options.columns}
      dataPreviewCalloutMessage={options.previewMessage}
      dataColumnsCalloutMessage={options.columnsMessage}
      dataPreviewCalloutContents={
        <Group align="flex-end">
          <DatasetParseControls
            onDataSourceMetadataChange={options.onDataSourceMetadataChange}
            {...options.dataSourceMetadata}
          />
          <Button
            onClick={() => {
              return options.onRequestDataReparse(
                options.dataSourceMetadata.parseOptions,
              );
            }}
            loading={options.isProcessing}
            disabled={options.isProcessing}
          >
            <Trans>Process data again</Trans>
          </Button>
        </Group>
      }
    />
  );
}

function _renderOnlineStorageAllowed(
  options: Readonly<{
    dataSourceMetadata: DataSourceMetadata;
    offlineOnlyTitle: string;
    onChange: Props["onDataSourceMetadataChange"];
  }>,
): JSX.Element | undefined {
  const dataSourceMetadata = options.dataSourceMetadata;
  if (!DatasetSource.canBeOfflineOnly(dataSourceMetadata)) {
    return undefined;
  }
  return (
    <Checkbox
      label={
        <>
          <Text span>
            <Trans>This dataset can be stored in the cloud. </Trans>
          </Text>
          {!dataSourceMetadata.onlineStorageAllowed ?
            <Callout mt="sm" title={options.offlineOnlyTitle} titleSize="xl">
              <Text c="red.8">
                <Trans>
                  This dataset will no longer be stored online and can only be
                  accessed as long as it is on your personal computer. Nobody on
                  your team will be able to access this data. This is
                  recommended only for very sensitive data.
                </Trans>
              </Text>
            </Callout>
          : null}
        </>
      }
      checked={dataSourceMetadata.onlineStorageAllowed}
      onChange={(event) => {
        options.onChange({
          ...dataSourceMetadata,
          onlineStorageAllowed: event.currentTarget.checked,
        });
      }}
    />
  );
}

function _renderErrorSummary(
  options: Readonly<RenderErrorSummaryOptions>,
): JSX.Element | undefined {
  if (!options.isVisible || options.items.length === 0) {
    return undefined;
  }
  return (
    <Callout color="error" title={options.title} message={options.message}>
      <Stack component="ul" className={classes.datasetImportFormErrorList} gap="xs" mt="xs">
        {options.items.map((item) => {
          return (
            <Text component="li" key={item.field} size="sm" c="red.8">
              {item.line}
            </Text>
          );
        })}
      </Stack>
    </Callout>
  );
}

type DatasetImportCopy = {
  columnsMessage: string;
  errorMessage: string;
  errorTitle: string;
  failureMessage: string;
  failureTitle: string;
  offlineOnlyTitle: string;
  previewMessage: string;
  successMessage: string;
  successTitle: string;
};

type RenderDatasetImportFeedbackOptions = {
  columns: ReturnType<typeof useImportedColumns>;
  copy: DatasetImportCopy;
  dataSourceMetadata: DataSourceMetadata;
  isProcessing: boolean;
  onDataSourceMetadataChange: Props["onDataSourceMetadataChange"];
  onRequestDataReparse: Props["onRequestDataReparse"];
  previewRows: UnknownObject[];
  validation: DatasetImportValidation;
};

function _renderDatasetImportFeedback(
  options: Readonly<RenderDatasetImportFeedbackOptions>,
): JSX.Element {
  return (
    <>
      {_renderImportStatus({
        numRows: options.dataSourceMetadata.datasetLoadResult.numRows,
        failureMessage: options.copy.failureMessage,
        failureTitle: options.copy.failureTitle,
        successMessage: options.copy.successMessage,
        successTitle: options.copy.successTitle,
      })}
      {_renderDatasetPreview({
        columns: options.columns,
        columnsMessage: options.copy.columnsMessage,
        dataSourceMetadata: options.dataSourceMetadata,
        isProcessing: options.isProcessing,
        onDataSourceMetadataChange: options.onDataSourceMetadataChange,
        onRequestDataReparse: options.onRequestDataReparse,
        previewMessage: options.copy.previewMessage,
        previewRows: options.previewRows,
      })}
      {_renderOnlineStorageAllowed({
        dataSourceMetadata: options.dataSourceMetadata,
        offlineOnlyTitle: options.copy.offlineOnlyTitle,
        onChange: options.onDataSourceMetadataChange,
      })}
      {_renderErrorSummary({
        isVisible: options.validation.isFormErrorSummaryVisible,
        items: options.validation.formErrorSummaryItems,
        title: options.copy.errorTitle,
        message: options.copy.errorMessage,
      })}
    </>
  );
}

function _renderSaveDatasetButton(
  options: Readonly<{
    disableSubmit: boolean | undefined;
    isOfflineBlocked: boolean;
    isSavePending: boolean;
  }>,
): JSX.Element {
  return (
    <OfflineGated>
      <Button
        loading={options.isSavePending}
        type="submit"
        disabled={options.disableSubmit}
        data-disabled={
          options.disableSubmit || options.isOfflineBlocked || undefined
        }
        aria-disabled={options.disableSubmit || options.isOfflineBlocked}
      >
        <Trans>Save Dataset</Trans>
      </Button>
    </OfflineGated>
  );
}

function useDatasetImportCopy(
  options: Readonly<{
    numColumns: number;
    numPreviewRows: number;
    numRows: number;
  }>,
): DatasetImportCopy {
  const { t } = useLingui();
  return {
    columnsMessage: t`${options.numColumns} columns were detected. Review the column info below to make sure they are correct. If they are not, change the import options above and click Upload again.`,
    errorMessage: t`Scroll up to the fields above, or use the list below.`,
    errorTitle: t`Fix these issues before saving`,
    failureMessage: t`No rows were read successfully`,
    failureTitle: t`Data processing failed`,
    offlineOnlyTitle: t`This dataset will be offline-only`,
    previewMessage: t`These are the first ${options.numPreviewRows} rows of your dataset. Check to see if the data is correct. If they are not, it's possible your dataset does not start on the first row or the CSV uses a different delimiter. Try adjusting those settings here.`,
    successMessage: t`Parsed ${options.numRows.toLocaleString()} rows successfully`,
    successTitle: t`Data processed successfully`,
  };
}

type DatasetImportFormState = {
  feedbackOptions: RenderDatasetImportFeedbackOptions;
  fieldOptions: RenderDatasetFieldsOptions;
  onSubmit: FormEventHandler<HTMLFormElement>;
  saveButtonOptions: Parameters<typeof _renderSaveDatasetButton>[0];
};

type CreateDatasetImportFormStateOptions = {
  columns: ReturnType<typeof useImportedColumns>;
  copy: DatasetImportCopy;
  fieldCopy: Pick<
    RenderDatasetFieldsOptions,
    | "descriptionLabel"
    | "descriptionPlaceholder"
    | "nameLabel"
    | "namePlaceholder"
  >;
  isOfflineBlocked: boolean;
  isSavePending: boolean;
  previewRows: UnknownObject[];
  props: Readonly<Props>;
  submitValues: (values: DatasetImportFormValues) => void;
  validation: DatasetImportValidation;
};

function _createDatasetImportFormState(
  options: Readonly<CreateDatasetImportFormStateOptions>,
): DatasetImportFormState {
  const { props, validation } = options;
  return {
    fieldOptions: { ...validation, ...options.fieldCopy },
    feedbackOptions: {
      columns: options.columns,
      copy: options.copy,
      dataSourceMetadata: props.dataSourceMetadata,
      isProcessing: props.isProcessing ?? false,
      onDataSourceMetadataChange: props.onDataSourceMetadataChange,
      onRequestDataReparse: props.onRequestDataReparse,
      previewRows: options.previewRows,
      validation,
    },
    onSubmit: validation.form.onSubmit(options.submitValues, (errors) => {
      return validation.onValidationFailure(errors);
    }),
    saveButtonOptions: {
      disableSubmit: props.disableSubmit,
      isOfflineBlocked: options.isOfflineBlocked,
      isSavePending: options.isSavePending,
    },
  };
}

function useDatasetImportFormState(
  props: Readonly<Props>,
): DatasetImportFormState {
  const { t } = useLingui();
  const validation = useDatasetImportValidation(props.initialDatasetName);
  const columns = useImportedColumns(props.dataSourceMetadata);
  const [saveDataset, isSavePending] = useSaveDataset({
    onAfterSave: props.onAfterSave,
    onSaveSuccess: props.onSaveSuccess,
  });
  const offline = useOfflineGate();
  const previewRows = useMemo(() => {
    return props.rows.slice(0, GlobalAppConfig.dataManagerApp.maxPreviewRows);
  }, [props.rows]);
  const copy = useDatasetImportCopy({
    numColumns: columns.length,
    numPreviewRows: previewRows.length,
    numRows: props.dataSourceMetadata.datasetLoadResult.numRows,
  });
  return _createDatasetImportFormState({
    columns,
    copy,
    fieldCopy: {
      nameLabel: t`Dataset Name`,
      namePlaceholder: t`Enter a name for this dataset`,
      descriptionLabel: t`Description`,
      descriptionPlaceholder: t`Enter a description for this dataset`,
    },
    isOfflineBlocked: offline.isBlocked,
    isSavePending,
    previewRows,
    props,
    submitValues: offline.guard((values) => {
      saveDataset({ ...values, ...props.dataSourceMetadata });
    }),
    validation,
  });
}

/**
 * This is the common form that shows up after a user has uploaded or connected
 * a data source. This is where the user can adjust settings, re-connect or
 * re-parse the data, preview the data, and (ultimately) finally save the
 * data source to their workspace.
 */
export function DatasetImportForm({ ...props }: Readonly<Props>): JSX.Element {
  const state = useDatasetImportFormState(props);
  return (
    <form onSubmit={state.onSubmit}>
      <Stack>
        {_renderDatasetFields(state.fieldOptions)}
        {_renderDatasetImportFeedback(state.feedbackOptions)}
        {_renderSaveDatasetButton(state.saveButtonOptions)}
      </Stack>
    </form>
  );
}
