import { Container, FileInput } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";

export function DataImportApp(): JSX.Element {
  return (
    <Container>
      <FileInput
        label="Upload a CSV"
        description="Select a CSV from your computer to import"
        placeholder="Select file"
        accept="text/csv"
      />
      <Dropzone.FullScreen
        onDrop={(files) => {
          console.log(files);
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
