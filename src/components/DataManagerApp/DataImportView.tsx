import { Button, Container, Stack, TextInput, Title } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { AppConfig } from "@/config/AppConfig";
import * as LocalDataset from "@/models/LocalDataset";
import { DataGrid } from "../ui/DataGrid";
import { FileUploadField } from "../ui/FileUploadField";
import { useSaveLocalDataset } from "./queries";
import { useCSV } from "./useCSV";

type DatasetForm = {
  name: string;
  description: string;
};

const { maxDatasetNameLength, maxDatasetDescriptionLength } =
  AppConfig.dataManagerApp;

export function DataImportView(): JSX.Element {
  const [saveDataset, isSavePending] = useSaveLocalDataset();
  const { csv, fileMetadata, parseFile } = useCSV({
    onNoFileProvided: () => {
      notifications.show({
        title: "No file selected",
        message: "Please select a file to import",
        color: "danger",
      });
    },
  });

  const form = useForm<DatasetForm>({
    initialValues: {
      name: "",
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

  return (
    <Container>
      <FileUploadField
        label="Upload a CSV"
        description="Select a CSV from your computer to import"
        placeholder="Select file"
        accept="text/csv"
        onSubmit={parseFile}
      />

      {csv && fileMetadata ?
        <Stack>
          <Title order={3}>Data Preview</Title>
          <DataGrid fields={csv.meta.fields ?? []} data={csv.data} />
          <form
            onSubmit={form.onSubmit((values) => {
              const dataset: LocalDataset.CreateT = LocalDataset.create({
                name: values.name,
                description: values.description,
                fileMetadata,
                csvMetadata: csv.meta,
                data: csv.data,
              });

              saveDataset(dataset, {
                onSuccess: () => {
                  notifications.show({
                    title: "Dataset saved",
                    message: `${dataset.name} saved successfully`,
                    color: "green",
                  });
                },
              });
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
              <Button loading={isSavePending} type="submit">
                Save Dataset
              </Button>
            </Stack>
          </form>
        </Stack>
      : null}

      <Dropzone.FullScreen
        onDrop={(files: FileWithPath[]) => {
          const uploadedFile = files[0];
          if (uploadedFile) {
            parseFile(uploadedFile);
          }
        }}
      >
        <Dropzone.Accept>
          <IconUpload
            size={52}
            color="var(--mantine-color-blue-6)"
            stroke={1.5}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX size={52} color="var(--mantine-color-red-6)" stroke={1.5} />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconPhoto
            size={52}
            color="var(--mantine-color-dimmed)"
            stroke={1.5}
          />
        </Dropzone.Idle>
      </Dropzone.FullScreen>
    </Container>
  );
}
