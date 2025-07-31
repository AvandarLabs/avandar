import { Box, BoxProps, Stack } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { MIMEType } from "@/lib/types/common";
import { notifyError } from "@/lib/ui/notifications/notifyError";
import { FileUploadField } from "@/lib/ui/singleton-forms/FileUploadField";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDataset } from "@/models/LocalDataset/types";
import { makeLocalDataset } from "@/models/LocalDataset/utils";
import { useCSVParser } from "../../hooks/useCSVParser";
import { DatasetUploadForm } from "../DatasetUploadForm";

type Props = BoxProps;
export function ManualUploadView({ ...props }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const { csv, fields, fileMetadata, parseFile } = useCSVParser({
    onNoFileProvided: () => {
      notifyError({
        title: "No file selected",
        message: "Please select a file to import",
      });
    },
  });

  const [_saveLocalDataset] = LocalDatasetClient.useInsert({
    queryToInvalidate: LocalDatasetClient.QueryKeys.getAll(),
  });

  const saveLocalDataset = async (
    values: DatasetUploadForm,
  ): Promise<LocalDataset> => {
    if (!csv || !fileMetadata) {
      notifyError({
        title: "No file selected",
        message: "Please select a file to import",
      });
      throw new Error("No file selected");
    }
    const dataset = makeLocalDataset({
      workspaceId: workspace.id,
      name: values.name,
      datasetType: "upload",
      description: values.description,
      fileMetadata,
      csvMetadata: csv.meta,
      data: csv.data,
      fields,
    });
    await new Promise<void>((resolve) => {
      _saveLocalDataset(
        { data: dataset },
        {
          onSuccess: () => {
            resolve();
          },
        },
      );
    });
    return dataset;
  };

  return (
    <Box {...props}>
      <Stack align="flex-start">
        <FileUploadField
          label="Upload a CSV"
          description="Select a CSV from your computer to import"
          placeholder="Select file"
          accept={MIMEType.TEXT_CSV}
          fullWidth
          onSubmit={parseFile}
        />

        {csv && fileMetadata ?
          <DatasetUploadForm
            defaultName={fileMetadata.name}
            rows={csv.data.slice(0, 500)}
            fields={fields}
            additionalDatasetSaveCallback={saveLocalDataset}
          />
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
      </Stack>
    </Box>
  );
}
