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
import { UnknownObject } from "$/lib/types/common";
import { useMemo, useState } from "react";
import { DuckDBLoadCSVResult } from "@/clients/DuckDBClient/DuckDBClient.types";
import { DatasetPreviewBlock } from "@/components/common/DatasetPreviewBlock";
import { AppConfig } from "@/config/AppConfig";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { useForm } from "@/lib/hooks/ui/useForm";
import { Callout } from "@/lib/ui/Callout";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import { Dataset } from "@/models/datasets/Dataset";
import { DetectedDatasetColumn } from "@/models/datasets/DatasetColumn";

export type DatasetUploadFormValues = {
  name: string;
  description: string;
  onlineStorageAllowed: boolean;
};

const { maxDatasetNameLength, maxDatasetDescriptionLength } =
  AppConfig.dataManagerApp;

const TOO_MANY_ERRORS_THRESHOLD = 1000;

type Props = {
  /**
   * Regardless of how many rows are passed in, only the first
   * `AppConfig.dataManagerApp.maxPreviewRows` will be displayed.
   */
  rows: UnknownObject[];
  defaultName: string;
  columns: readonly DetectedDatasetColumn[];
  doDatasetSave: (
    datasetFormValues: DatasetUploadFormValues,
  ) => Promise<Dataset>;
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
};

export function DatasetUploadForm({
  rows,
  columns,
  defaultName,
  doDatasetSave,
  disableSubmit,
  loadCSVResult,
  onRequestDataParse,
  isProcessing = false,
  showOnlineStorageAllowed = true,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [numRowsToSkip, setNumRowsToSkip] = useState(
    loadCSVResult.csvSniff.SkipRows,
  );
  const [delimiter, setDelimiter] = useState(loadCSVResult.csvSniff.Delimiter);
  const [saveDataset, isSavePending] = useMutation({
    mutationFn: doDatasetSave,
    onSuccess: async (savedDataset) => {
      notifySuccess({
        title: "Dataset saved",
        message: `Dataset "${savedDataset.name}" saved successfully`,
      });

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

  const form = useForm<DatasetUploadFormValues>({
    initialValues: {
      name: defaultName,
      description: "",
      onlineStorageAllowed: true,
    },
    validateInputOnChange: true,
    validate: {
      name: (value) => {
        return value.length < maxDatasetNameLength ? null : "Name is too long";
      },
      description: (value) => {
        return value.length < maxDatasetDescriptionLength ?
            null
          : "Description is too long";
      },
    },
  });

  const renderProcessState = () => {
    const { numRows: numSuccessRows, numRejectedRows } = loadCSVResult;
    const formattedSuccessNum = numSuccessRows.toLocaleString();
    const formattedRejectedNum = numRejectedRows.toLocaleString();

    if (numSuccessRows === 0) {
      return (
        <Callout
          title="Data processing failed"
          color="error"
          message="No rows were read successfully"
        />
      );
    } else if (numRejectedRows === 0) {
      return (
        <Callout
          title="Data processed successfully"
          color="success"
          message={`Parsed ${formattedSuccessNum} rows successfully`}
        />
      );
    } else if (
      numSuccessRows > numRejectedRows * 2 &&
      numRejectedRows < TOO_MANY_ERRORS_THRESHOLD
    ) {
      // if the number of success rows is greater than double the number
      // of errors, then we can say that it was mostly a success
      return (
        <Callout
          title="Data processed successfully with some errors"
          color="warning"
          message={`Parsed ${formattedSuccessNum} rows successfully, but ${formattedRejectedNum} rows were rejected`}
        />
      );
    }
    return (
      <Callout
        title="Data processed successfully with a large number of errors"
        color="warning"
        message={`Parsed ${formattedSuccessNum} rows successfully, but ${
          numRejectedRows > 1000 ?
            " over 1000 rows were rejected"
          : ` ${formattedRejectedNum} rows were rejected`
        }`}
      />
    );
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        saveDataset(values);
      })}
    >
      <Stack>
        <TextInput
          key={form.key("name")}
          label="Dataset Name"
          placeholder="Enter a name for this dataset"
          required
          {...form.getInputProps("name")}
        />
        <TextInput
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
                  return setDelimiter(e.target.value);
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

        <Button loading={isSavePending} type="submit" disabled={disableSubmit}>
          Save Dataset
        </Button>
      </Stack>
    </form>
  );
}
