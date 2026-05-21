import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Checkbox, Group, Stack, Text, TextInput } from "@mantine/core";
import { FormErrors, useForm } from "@mantine/form";
import { Callout, notifyError } from "@ui";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { useMemo, useRef, useState } from "react";
import { DuckDbLoadCsvResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import { DatasetPreviewBlock } from "@/components/DatasetPreviewBlock/DatasetPreviewBlock";
import { OfflineGated } from "@/components/offline/OfflineGated";
import { AppConfig } from "@/config/AppConfig";
import { useOfflineGate } from "@/lib/offline/useOfflineGate";
import {
  CsvFileLoadResult,
  XlsxFileLoadResult,
} from "../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile";
import { DatasetParseControls } from "./DatasetParseControls";
import { useImportedColumns } from "./useImportedColumns/useImportedColumns";
import {
  CsvParseOptions,
  FileParseOptions,
  GoogleSheetsParseOptions,
  useSaveDataset,
  XlsxParseOptions,
} from "./useSaveDataset/useSaveDataset";
import type { UnknownObject } from "@utils";

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
  AppConfig.dataManagerApp;

const VALIDATION_FIELD_ORDER = ["name", "description"] as const;

type ValidationField = (typeof VALIDATION_FIELD_ORDER)[number];

function useErrorMessageForField(): (
  field: ValidationField,
  value: string,
) => string | null {
  const { t } = useLingui();
  return (field, value) => {
    if (field === "name") {
      return value.length < maxDatasetNameLength ?
          null
        : t`Dataset name must be under ${maxDatasetNameLength} characters (current: ${value.length}).`;
    }

    return value.length < maxDatasetDescriptionLength ?
        null
      : t`Description must be under ${maxDatasetDescriptionLength} characters (current: ${value.length}).`;
  };
}

type Props = {
  /**
   * Regardless of how many rows are passed in, only the first
   * `AppConfig.dataManagerApp.maxPreviewRows` will be displayed.
   */
  rows: UnknownObject[];
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
  onDataSourceMetadataChange,
  onRequestDataReparse,
  isProcessing = false,
  dataSourceMetadata,
  onAfterSave,
  onSaveSuccess,
}: Props): JSX.Element {
  const { t } = useLingui();
  const errorMessageForField = useErrorMessageForField();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const [isFormErrorSummaryVisible, setIsFormErrorSummaryVisible] =
    useState(false);
  const importedColumns = useImportedColumns(dataSourceMetadata);

  const form = useForm<DatasetImportFormValues>({
    initialValues: {
      name: initialDatasetName,
      description: "",
    },
    validateInputOnChange: true,
    validate: {
      name: (value) => {
        return errorMessageForField("name", value);
      },
      description: (value) => {
        return errorMessageForField("description", value);
      },
    },
  });

  const [saveDataset, isSavePending] = useSaveDataset({
    onAfterSave,
    onSaveSuccess,
  });
  const offline = useOfflineGate();

  const previewRows = useMemo(() => {
    return rows.slice(0, AppConfig.dataManagerApp.maxPreviewRows);
  }, [rows]);

  const onValidationFailure = (
    errors: FormErrors,
    _values: DatasetImportFormValues,
  ) => {
    setIsFormErrorSummaryVisible(true);

    for (const field of VALIDATION_FIELD_ORDER) {
      if (!errors[field]) {
        continue;
      }

      const message =
        typeof errors[field] === "string" ?
          errors[field]
        : t`Please fix the highlighted fields.`;

      notifyError({
        title: t`Can't save dataset`,
        message,
      });

      const inputRef = field === "name" ? nameInputRef : descriptionInputRef;
      const node = inputRef.current;
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "nearest" });
        node.focus({ preventScroll: true });
      }
      break;
    }
  };

  const formErrorSummaryItems = VALIDATION_FIELD_ORDER.flatMap((field) => {
    const err = form.errors[field];
    if (!err) {
      return [];
    }
    const label = field === "name" ? t`Dataset name` : t`Description`;
    const text = typeof err === "string" ? err : String(err);
    return [{ field, line: `${label}: ${text}` }];
  });

  const elements = {
    successOrFailedStatus: () => {
      const {
        datasetLoadResult: { numRows },
      } = dataSourceMetadata;
      const formattedNumRows = numRows.toLocaleString();
      if (numRows === 0) {
        return (
          <Callout
            title={t`Data processing failed`}
            color="error"
            message={t`No rows were read successfully`}
          />
        );
      }

      return (
        <Callout
          title={t`Data processed successfully`}
          color="success"
          message={t`Parsed ${formattedNumRows} rows successfully`}
        />
      );
    },

    reparseDataButton: () => {
      const { parseOptions } = dataSourceMetadata;
      return (
        <Button
          onClick={() => {
            return onRequestDataReparse(parseOptions);
          }}
          loading={isProcessing}
          disabled={isProcessing}
        >
          <Trans>Process data again</Trans>
        </Button>
      );
    },

    onlineStorageAllowedCheckbox: () => {
      if (DatasetSource.canBeOfflineOnly(dataSourceMetadata)) {
        return (
          <Checkbox
            label={
              <>
                <Text span>
                  <Trans>This dataset can be stored in the cloud. </Trans>
                </Text>
                {!dataSourceMetadata.onlineStorageAllowed ?
                  <Callout
                    mt="sm"
                    title={t`This dataset will be offline-only`}
                    titleSize="xl"
                  >
                    <Text c="red.8">
                      <Trans>
                        This dataset will no longer be stored online and can
                        only be accessed as long as it is on your personal
                        computer. Nobody on your team will be able to access
                        this data. This is recommended only for very sensitive
                        data.
                      </Trans>
                    </Text>
                  </Callout>
                : null}
              </>
            }
            checked={dataSourceMetadata.onlineStorageAllowed}
            onChange={(event) => {
              onDataSourceMetadataChange({
                ...dataSourceMetadata,
                onlineStorageAllowed: event.currentTarget.checked,
              });
            }}
          />
        );
      }
      return null;
    },
  };

  return (
    <form
      onSubmit={form.onSubmit(
        offline.guard((formValues) => {
          saveDataset({
            ...formValues,
            ...dataSourceMetadata,
          });
        }),
        (errors, values, _event) => {
          onValidationFailure(errors, values);
        },
      )}
    >
      <Stack>
        <TextInput
          ref={nameInputRef}
          key={form.key("name")}
          label={t`Dataset Name`}
          placeholder={t`Enter a name for this dataset`}
          required
          {...form.getInputProps("name")}
        />
        <TextInput
          ref={descriptionInputRef}
          key={form.key("description")}
          label={t`Description`}
          placeholder={t`Enter a description for this dataset`}
          {...form.getInputProps("description")}
        />

        {elements.successOrFailedStatus()}

        <DatasetPreviewBlock
          previewRows={previewRows}
          columns={importedColumns}
          dataPreviewCalloutMessage={t`These are the first ${previewRows.length} rows of your dataset. Check to see if the data is correct. If they are not, it's possible your dataset does not start on the first row or the CSV uses a different delimiter. Try adjusting those settings here.`}
          dataColumnsCalloutMessage={t`${importedColumns.length} columns were detected. Review the column info below to make sure they are correct. If they are not, change the import options above and click Upload again.`}
          dataPreviewCalloutContents={
            <Group align="flex-end">
              <DatasetParseControls
                onDataSourceMetadataChange={onDataSourceMetadataChange}
                {...dataSourceMetadata}
              />
              {elements.reparseDataButton()}
            </Group>
          }
        />

        {elements.onlineStorageAllowedCheckbox()}

        {isFormErrorSummaryVisible && formErrorSummaryItems.length > 0 ?
          <Callout
            color="error"
            title={t`Fix these issues before saving`}
            message={t`Scroll up to the fields above, or use the list below.`}
          >
            <Stack
              component="ul"
              gap="xs"
              mt="xs"
              style={{ listStyle: "disc", paddingInlineStart: "1.25rem" }}
            >
              {formErrorSummaryItems.map((item) => {
                return (
                  <Text component="li" key={item.field} size="sm" c="red.8">
                    {item.line}
                  </Text>
                );
              })}
            </Stack>
          </Callout>
        : null}

        <OfflineGated isBlocked={offline.isBlocked}>
          <Button
            loading={isSavePending}
            type="submit"
            disabled={disableSubmit}
            data-disabled={disableSubmit || offline.isBlocked || undefined}
            aria-disabled={disableSubmit || offline.isBlocked}
          >
            <Trans>Save Dataset</Trans>
          </Button>
        </OfflineGated>
      </Stack>
    </form>
  );
}
