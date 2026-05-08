import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";

type Props = {
  onRequestFileParse: (file: File) => void;
};

export function ManualUploadDropzone({
  onRequestFileParse,
}: Props): JSX.Element {
  return (
    <Dropzone.FullScreen
      onDrop={(files: FileWithPath[]) => {
        const file = files[0];
        if (file) {
          onRequestFileParse(file);
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
        <IconPhoto size={52} color="var(--mantine-color-dimmed)" stroke={1.5} />
      </Dropzone.Idle>
    </Dropzone.FullScreen>
  );
}
