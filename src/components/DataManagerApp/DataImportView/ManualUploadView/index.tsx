import { Box, BoxProps, Stack } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { invariant } from "@tanstack/react-router";
import { DatasetClient } from "@/clients/datsets/DatasetClient";
import { DatasetRawDataClient } from "@/clients/datsets/DatasetRawDataClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { MIMEType } from "@/lib/types/common";
import { notifyError } from "@/lib/ui/notifications/notifyError";
import { FileUploadField } from "@/lib/ui/singleton-forms/FileUploadField";
import { unparseDataset } from "@/models/LocalDataset/utils";
import { useCSVParser } from "../../hooks/useCSVParser";
import { DatasetUploadForm } from "../DatasetUploadForm";

type Props = BoxProps;
export function ManualUploadView({ ...props }: Props): JSX.Element {
  const queryClient = useQueryClient();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const {
    csv,
    columns: fields,
    fileMetadata,
    parseFile,
  } = useCSVParser({
    onNoFileProvided: () => {
      notifyError({
        title: "No file selected",
        message: "Please select a file to import",
      });
    },
  });

  const saveLocalCSVToBackend = async (values: DatasetUploadForm) => {
    // this function can't be called without available file metadata
    invariant(fileMetadata, "No file metadata is available");
    invariant(csv, "No parsed CSV data is available");
    invariant(userProfile, "No user profile is available");

    const dataset = await DatasetClient.insertLocalCSVDataset({
      workspaceId: workspace.id,
      datasetName: values.name,
      datasetDescription: values.description,
      delimiter: ",",
      sizeInBytes: fileMetadata.sizeInBytes,
      columns: fields.map((field, idx) => {
        return {
          name: field.name,
          data_type: field.dataType,
          column_idx: idx,
        };
      }),
    });
    queryClient.invalidateQueries({
      queryKey: DatasetClient.QueryKeys.getAll(),
    });

    // and also save the raw data locally to Dexie
    const rawDataString = unparseDataset({
      datasetType: MIMEType.TEXT_CSV,
      data: csv.data,
    });

    await DatasetRawDataClient.insert({
      data: {
        createdAt: new Date(),
        updatedAt: new Date(),
        datasetId: dataset.id,
        sourceType: "local_csv",
        ownerId: workspace.ownerId,
        ownerProfileId: userProfile.profileId,
        workspaceId: workspace.id,
        data: rawDataString,
      },
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
            columns={fields}
            doDatasetSave={saveLocalCSVToBackend}
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
