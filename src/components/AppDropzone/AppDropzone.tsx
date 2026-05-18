import { Dropzone } from "@mantine/dropzone";
import { IconFileSpreadsheet, IconUpload, IconX } from "@tabler/icons-react";
import { MIMEType } from "@utils";
import { handleAppDropzoneDrop } from "./handleAppDropzoneDrop";
import type { ReactNode } from "react";

const ACCEPTED_MIME_TYPES = [
  MIMEType.TEXT_CSV,
  MIMEType.APPLICATION_MS_EXCEL,
  MIMEType.APPLICATION_OPENXML_EXCEL,
];

type Props = { children: ReactNode };

/**
 * Wraps the workspace app shell so that the user can drop a CSV or
 * Excel file from anywhere in the app. On drop, the app prompts the
 * user to confirm the import and then opens a large modal containing
 * the dataset import flow.
 */
export function AppDropzone({ children }: Props): JSX.Element {
  return (
    <>
      {children}
      <Dropzone.FullScreen
        accept={ACCEPTED_MIME_TYPES}
        onDrop={handleAppDropzoneDrop}
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
          <IconFileSpreadsheet
            size={52}
            color="var(--mantine-color-dimmed)"
            stroke={1.5}
          />
        </Dropzone.Idle>
      </Dropzone.FullScreen>
    </>
  );
}
