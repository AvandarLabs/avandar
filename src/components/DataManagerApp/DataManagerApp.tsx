import {
  Button,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPhoto, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { AppConfig } from "@/config/AppConfig";
import * as LocalDataset from "@/models/LocalDataset";
import { DataGrid } from "../ui/DataGrid";
import { FileUploadField } from "../ui/FileUploadField";
import {
  useDeleteLocalDataset,
  useGetAllLocalDatasets,
  useSaveLocalDataset,
} from "./queries";
import { useCSV } from "./useCSV";

type DatasetForm = {
  name: string;
  description: string;
};

const { maxDatasetNameLength, maxDatasetDescriptionLength } =
  AppConfig.dataManagerApp;

export function DataManagerApp(): JSX.Element {
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
  const [saveDataset, isSavePending] = useSaveLocalDataset();
  const [allDatasets, isLoadingDatasets] = useGetAllLocalDatasets();
  const [deleteLocalDataset, isDeletePending] = useDeleteLocalDataset();

  return (
    <Container>
      <FileUploadField
        label="Upload a CSV"
        description="Select a CSV from your computer to import"
        placeholder="Select file"
        accept="text/csv"
        onSubmit={parseFile}
      />

      {isLoadingDatasets ?
        <Stack>
          <Title order={3}>Loading datasets...</Title>
        </Stack>
      : null}

      {allDatasets ?
        <Stack>
          <Title order={3}>Datasets</Title>
          {allDatasets.map((dataset) => {
            return (
              <Group key={dataset.id}>
                <Link {...LocalDataset.getDatasetLinkProps(dataset.id)}>
                  {dataset.name}
                </Link>

                <ThemeIcon
                  c="danger"
                  bg="none"
                  onClick={() => {
                    modals.openConfirmModal({
                      title: "Delete dataset",
                      children: (
                        <Text>
                          Are you sure you want to delete {dataset.name}?
                        </Text>
                      ),
                      labels: { confirm: "Delete", cancel: "Cancel" },
                      confirmProps: {
                        color: "danger",
                        loading: isDeletePending,
                      },
                      onConfirm: () => {
                        deleteLocalDataset(dataset.id);
                      },
                    });
                  }}
                >
                  <IconTrash />
                </ThemeIcon>
              </Group>
            );
          })}
        </Stack>
      : null}

      {csv && fileMetadata ?
        <Stack>
          <Title order={3}>Data Preview</Title>
          <DataGrid fields={csv.meta.fields ?? []} data={csv.data} />
          <form
            onSubmit={form.onSubmit((values) => {
              const creationTime = new Date();

              const dataset: LocalDataset.CreateT = {
                id: undefined,
                name: values.name,
                mimeType: fileMetadata.mimeType,
                description: values.description,
                createdAt: creationTime,
                updatedAt: creationTime,
                sizeInBytes: fileMetadata.sizeInBytes,
                data: LocalDataset.unparse({
                  datasetType: fileMetadata.mimeType,
                  data: csv.data,
                }),
                delimiter: csv.meta.delimiter,
                firstRowIsHeader: true,
              };
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
