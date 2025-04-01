import { Container, List, Stack, Title } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { DataGrid } from "../ui/DataGrid";
import { FileUploadField } from "../ui/FileUploadField";
import { useCSV } from "./useCSV";

export function DataImportApp(): JSX.Element {
  const { csv, parseFile } = useCSV();

  return (
    <Container>
      <FileUploadField
        label="Upload a CSV"
        description="Select a CSV from your computer to import"
        placeholder="Select file"
        accept="text/csv"
        onSubmit={parseFile}
      />

      {csv ?
        <Stack>
          <Title order={3}>Headers</Title>
          <List>
            {csv.csvMeta.fields?.map((field) => {
              return <List.Item key={field}>{field}</List.Item>;
            })}
          </List>
          <DataGrid fields={csv.csvMeta.fields ?? []} data={csv.data} />
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
