import { useMutation } from "@hooks/useMutation/useMutation";
import {
  Button,
  Checkbox,
  Group,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { notifyError, notifySuccess } from "@ui/notifications/notify";
import { useMemo, useRef, useState } from "react";
import { DuckDBLoadCSVResult } from "@/clients/DuckDBClient/DuckDBClient.types";
import { DatasetPreviewBlock } from "@/components/common/DatasetPreviewBlock";
import { AppConfig } from "@/config/AppConfig";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useForm } from "@/lib/hooks/ui/useForm/useForm";
import { Callout } from "@/lib/ui/Callout";
import type { FormErrors } from "@mantine/form";
import type { UnknownObject } from "@utils/types/common.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DetectedDatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.types";

export type DatasetImportFormValues = {
  name: string;
  description: string;
  onlineStorageAllowed: boolean;
};

const { maxDatasetNameLength, maxDatasetDescriptionLength } =
  AppConfig.dataManagerApp;

const VALIDATION_FIELD_ORDER = ["name", "description"] as const;

type ValidationField = (typeof VALIDATION_FIELD_ORDER)[number];

function _errorMessageForField(
  field: ValidationField,
  value: string,
): string | null {
  if (field === "name") {
    return value.length < maxDatasetNameLength ?
        null
      : `Dataset name must be under ${maxDatasetNameLength} characters ` +
          `(current: ${value.length}).`;
  }

  return value.length < maxDatasetDescriptionLength ?
      null
    : `Description must be under ${maxDatasetDescriptionLength} characters ` +
        `(current: ${value.length}).`;
}

type Props = {
  /**
   * Regardless of how many rows are passed in, only the first
   * `AppConfig.dataManagerApp.maxPreviewRows` will be displayed.
   */
  rows: UnknownObject[];
  defaultName: string;
  columns: readonly DetectedDatasetColumn[];
  doDatasetSave: (
    datasetFormValues: DatasetImportFormValues,
  ) => Promise<Dataset.T>;
  disableSubmit?: boolean;
  loadCSVResult: DuckDBLoadCSVResult;

  /** When the user requests to parse the data again. */
  onRequestDataParse: (parseConfig: {
    numRowsToSkip: number;
    delimiter: string;
  }) => void;
  isProcessing?: boolean;

  /**
   * If true, show the "cloud storage" toggle which can mark the dataset as
   * offline-only.
   */
  showOnlineStorageAllowed?: boolean;

  /**
   * Called after the dataset is saved, before navigating away.
   *
   * This is intentionally not awaited, so callers can kick off background work
   * (like online syncing) without blocking navigation.
   */
  onDatasetSaved?: (options: {
    savedDataset: Dataset.T;
    datasetFormValues: DatasetImportFormValues;
  }) => void;
};

export function DatasetImportForm({
  rows,
  columns,
  defaultName,
  doDatasetSave,
  disableSubmit,
  loadCSVResult,
  onRequestDataParse,
  isProcessing = false,
  showOnlineStorageAllowed = true,
  onDatasetSaved,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  const [numRowsToSkip, setNumRowsToSkip] = useState(
    loadCSVResult.csvSniff.SkipRows,
  );
  const [delimiter, setDelimiter] = useState(loadCSVResult.csvSniff.Delimiter);

  const form = useForm<DatasetImportFormValues>({
    initialValues: {
      name: defaultName,
      description: "",
      onlineStorageAllowed: true,
    },
    validateInputOnChange: true,
    validate: {
      name: (value) => {
        return _errorMessageForField("name", value);
      },
      description: (value) => {
        return _errorMessageForField("description", value);
      },
    },
  });

  const [saveDataset, isSavePending] = useMutation({
    mutationFn: doDatasetSave,
    onSuccess: async (savedDataset) => {
      setShowValidationSummary(false);
      notifySuccess({
        title: "Dataset saved",
        message: `Dataset "${savedDataset.name}" saved successfully`,
      });

      if (onDatasetSaved) {
        try {
          onDatasetSaved({
            savedDataset,
            datasetFormValues: form.getValues(),
          });
        } catch {
          // Do nothing. Navigation should not be blocked by background work.
        }
      }

      navigate(
        AppLinks.dataManagerDatasetView({
          workspaceSlug: workspace.slug,
          datasetId: savedDataset.id,
          datasetName: savedDataset.name,
        }),
      );
    },
    onError: () => {
      notifyError({
        title: "Error saving dataset",
        message: "An error occurred while saving the dataset",
      });
    },
  });

  const previewRows = useMemo(() => {
    return rows.slice(0, AppConfig.dataManagerApp.maxPreviewRows);
  }, [rows]);

  const onValidationFailure = (
    errors: FormErrors,
    _values: DatasetImportFormValues,
  ) => {
    setShowValidationSummary(true);

    for (const field of VALIDATION_FIELD_ORDER) {
      if (!errors[field]) {
        continue;
      }

      const message =
        typeof errors[field] === "string" ?
          errors[field]
        : "Please fix the highlighted fields.";

      notifyError({
        title: "Can't save dataset",
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

  const validationSummaryItems = VALIDATION_FIELD_ORDER.flatMap((field) => {
    const err = form.errors[field];
    if (!err) {
      return [];
    }
    const label = field === "name" ? "Dataset name" : "Description";
    const text = typeof err === "string" ? err : String(err);
    return [{ field, line: `${label}: ${text}` }];
  });

  const renderProcessState = () => {
    const { numRows } = loadCSVResult;
    const formattedNumRows = numRows.toLocaleString();

    if (numRows === 0) {
      return (
        <Callout
          title="Data processing failed"
          color="error"
          message="No rows were read successfully"
        />
      );
    }

    return (
      <Callout
        title="Data processed successfully"
        color="success"
        message={`Parsed ${formattedNumRows} rows successfully`}
      />
    );
  };

  return (
    <form
      onSubmit={form.onSubmit(
        (values) => {
          saveDataset(values);
        },
        (errors, values, _event) => {
          onValidationFailure(errors, values);
        },
      )}
    >
      <Stack>
        <TextInput
          ref={nameInputRef}
          key={form.key("name")}
          label="Dataset Name"
          placeholder="Enter a name for this dataset"
          required
          {...form.getInputProps("name")}
        />
        <TextInput
          ref={descriptionInputRef}
          key={form.key("description")}
          label="Description"
          placeholder="Enter a description for this dataset"
          {...form.getInputProps("description")}
        />

        {renderProcessState()}

        <DatasetPreviewBlock
          previewRows={previewRows}
          columns={columns}
          dataPreviewCalloutMessage={`These are the first ${previewRows.length} rows
            of your dataset. Check to see if the data is correct. If they are not,
            it's possible your dataset does not start on the first row or the CSV
            uses a different delimiter. Try adjusting those settings here.`}
          dataColumnsCalloutMessage={`${columns.length} columns were detected.
            Review the column info below to make sure they are correct. If they
            are not, change the import options above and click Upload again.`}
          dataPreviewCalloutContents={
            <Group align="flex-end">
              <NumberInput
                label="Number of rows to skip"
                value={numRowsToSkip}
                onChange={(value) => {
                  return setNumRowsToSkip(Number(value));
                }}
              />
              <TextInput
                label="Delimiter"
                value={delimiter}
                onChange={(e) => {
                  return setDelimiter(e.currentTarget.value);
                }}
              />
              <Button
                onClick={() => {
                  return onRequestDataParse({
                    numRowsToSkip,
                    delimiter,
                  });
                }}
                loading={isProcessing}
                disabled={isProcessing}
              >
                Process data again
              </Button>
            </Group>
          }
        />

        {showOnlineStorageAllowed ?
          <Checkbox
            key={form.key("onlineStorageAllowed")}
            label={
              <>
                <Text span>This dataset can be stored in the cloud. </Text>
                {!form.getValues().onlineStorageAllowed ?
                  <Callout
                    mt="sm"
                    title="This dataset will be offline-only"
                    titleSize="xl"
                  >
                    <Text c="red.8">
                      This dataset will no longer be stored online and can only
                      be accessed as long as it is on your personal computer.
                      Nobody on your team will be able to access this data. This
                      is recommended only for very sensitive data.
                    </Text>
                  </Callout>
                : null}
              </>
            }
            {...form.getInputProps("onlineStorageAllowed", {
              type: "checkbox",
            })}
          />
        : null}

        {showValidationSummary && validationSummaryItems.length > 0 ?
          <Callout
            color="error"
            title="Fix these issues before saving"
            message="Scroll up to the fields above, or use the list below."
          >
            <Stack
              component="ul"
              gap="xs"
              mt="xs"
              style={{ listStyle: "disc", paddingInlineStart: "1.25rem" }}
            >
              {validationSummaryItems.map((item) => {
                return (
                  <Text component="li" key={item.field} size="sm" c="red.8">
                    {item.line}
                  </Text>
                );
              })}
            </Stack>
          </Callout>
        : null}

        <Button loading={isSavePending} type="submit" disabled={disableSubmit}>
          Save Dataset
        </Button>
      </Stack>
    </form>
  );
}
