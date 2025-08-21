import { Button, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppConfig } from "@/config/AppConfig";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@/lib/hooks/query/useMutation";
import { UnknownObject } from "@/lib/types/common";
import { Callout } from "@/lib/ui/Callout";
import { DataGrid } from "@/lib/ui/data-viz/DataGrid";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { Dataset } from "@/models/datasets/Dataset";
import { DetectedDatasetColumn } from "../../hooks/detectColumnDataTypes";

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
  rows: UnknownObject[];
  defaultName: string;
  columns: readonly DetectedDatasetColumn[];
  doDatasetSave: (values: DatasetUploadForm) => Promise<Dataset>;
  disableSubmit?: boolean;
};

export function DatasetUploadForm({
  rows,
  columns,
  defaultName,
  doDatasetSave,
  disableSubmit,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [saveDataset, isSavePending] = useMutation({
    mutationFn: doDatasetSave,
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

  const columnNames = columns.map(getProp("name"));
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
        <Callout
          title="Data Preview"
          color="info"
          message={` These are the first ${rows.length} rows of your dataset.
            Check to see if the data is correct. If they are not, change the
            import options above and click Upload again.`}
        />
        <DataGrid columnNames={columnNames} data={previewRows} />
        <Callout
          title="Column info"
          color="info"
          message={`${columns.length} columns were detected. Review the column
            info below to make sure they are correct. If they are not, change
            the import options above and click Upload again.`}
        />
        <ObjectDescriptionList
          data={columns}
          renderAsTable
          itemRenderOptions={{ excludeKeys: ["columnIdx"] }}
        />

        <Button loading={isSavePending} type="submit" disabled={disableSubmit}>
          Save Dataset
        </Button>
      </Stack>
    </form>
  );
}
