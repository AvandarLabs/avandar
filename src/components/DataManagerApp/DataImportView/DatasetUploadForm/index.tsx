import { Button, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppConfig } from "@/config/AppConfig";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { RawDataRecordRow } from "@/lib/types/common";
import { DataGrid } from "@/lib/ui/data-viz/DataGrid";
import { notifyError } from "@/lib/ui/notifications/notifyError";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDataset } from "@/models/LocalDataset/types";

export type DatasetUploadForm = {
  name: string;
  description: string;
};

const { maxDatasetNameLength, maxDatasetDescriptionLength } =
  AppConfig.dataManagerApp;

type Props = {
  /**
   * Regardless of how many rows are passed in, only the first
   * `AppConfig.dataManagerApp.maxPreviewRows` will be displayed.
   */
  rows: RawDataRecordRow[];
  defaultName: string;
  fields: readonly LocalDatasetField[];
  additionalDatasetSaveCallback: (
    values: DatasetUploadForm,
  ) => Promise<LocalDataset>;
  disableSubmit?: boolean;
};

export function DatasetUploadForm({
  rows,
  fields,
  defaultName,
  additionalDatasetSaveCallback,
  disableSubmit,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();

  // TODO(jpsyx): add this back once we have a DatasetClient
  const [saveDataset, isSavePending] = useMutation<
    LocalDataset,
    DatasetUploadForm,
    unknown
  >({
    mutationFn: async (values: DatasetUploadForm) => {
      const savedDataset = await additionalDatasetSaveCallback(values);

      return savedDataset;
    },
    onSuccess: async (savedDataset) => {
      if (!savedDataset?.id) {
        notifyError({
          title: "Routing failed",
          message: "No dataset ID returned.",
        });
        return;
      }

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

  const form = useForm<DatasetUploadForm>({
    initialValues: {
      name: defaultName,
      description: "",
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

  const columnNames = fields.map(getProp("name"));
  return (
    <Stack w="100%">
      <Title order={3}>Data Preview</Title>
      <DataGrid columnNames={columnNames} data={previewRows} />
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
          <Button
            loading={isSavePending}
            type="submit"
            disabled={disableSubmit}
          >
            Save Dataset
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
