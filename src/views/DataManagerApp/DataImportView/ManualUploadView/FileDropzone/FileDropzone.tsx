import { MIMEType } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconFileImport, IconFileX, IconUpload } from "@tabler/icons-react";
import { notifyError } from "@/utils/notifications/notify";
import css from "@/views/DataManagerApp/DataImportView/ManualUploadView/FileDropzone/FileDropzone.module.css";
import type { ReactNode } from "react";

/**
 * Accepted types keyed by MIME with their extensions alongside.
 *
 * The extensions are not decoration. A CSV exported by Excel often arrives
 * with `application/vnd.ms-excel` as its type, and some systems hand over an
 * empty type altogether, so matching on MIME alone rejects files the parser
 * handles perfectly well.
 */
const ACCEPTED_FILE_TYPES: Record<string, string[]> = {
  [MIMEType.TEXT_CSV]: [".csv"],
  [MIMEType.APPLICATION_MS_EXCEL]: [".csv", ".xls"],
  [MIMEType.APPLICATION_OPENXML_EXCEL]: [".xlsx"],
  [MIMEType.APPLICATION_PDF]: [".pdf"],
};

const ICON_SIZE = 28;

type Props = {
  /** Called with the chosen file. Parsing starts immediately. */
  onSelect: (file: File) => void;

  /** True while the chosen file is being read. */
  isLoading: boolean;
};

/**
 * The entry point of a manual import: one target that takes a dropped file
 * or opens the file picker on click.
 *
 * Choosing a file parses it straight away. The two-step pick-then-confirm
 * flow this replaces asked for a decision the user had already made by
 * choosing the file.
 */
export function FileDropzone({
  onSelect,
  isLoading,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <Dropzone
      accept={ACCEPTED_FILE_TYPES}
      className={css.fileDropzone}
      classNames={{ inner: css.fileDropzoneInner }}
      loading={isLoading}
      aria-label={t`Upload a file`}
      onDrop={(files) => {
        const [file] = files;
        if (file) {
          onSelect(file);
        }
      }}
      onReject={() => {
        notifyError({
          title: t`That file type is not supported`,
          message: t`Avandar can import CSV, Excel, and PDF files.`,
        });
      }}
    >
      <Stack align="center" gap="xs">
        <Dropzone.Accept>
          <IconUpload
            size={ICON_SIZE}
            stroke={1.4}
            aria-hidden
            className={css.fileDropzoneIconAccept}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconFileX
            size={ICON_SIZE}
            stroke={1.4}
            aria-hidden
            className={css.fileDropzoneIconReject}
          />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconFileImport
            size={ICON_SIZE}
            stroke={1.4}
            aria-hidden
            className={css.fileDropzoneIconIdle}
          />
        </Dropzone.Idle>

        <Stack align="center" gap={2}>
          <Text size="sm" fw={500}>
            <Trans>Drop a file here, or click to browse</Trans>
          </Text>
          <Text size="xs" c="dimmed">
            <Trans>CSV, Excel, or PDF. One file at a time.</Trans>
          </Text>
        </Stack>
      </Stack>
    </Dropzone>
  );
}
