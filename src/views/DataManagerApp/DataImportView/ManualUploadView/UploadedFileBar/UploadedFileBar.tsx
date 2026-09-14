import { MIMEType, formatFileSize } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, FileButton, Group, Text } from "@mantine/core";
import css from "@/views/DataManagerApp/DataImportView/ManualUploadView/UploadedFileBar/UploadedFileBar.module.css";
import { DatasetSourceIcon } from "@/views/DataManagerApp/DatasetSourceIcon";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { ReactNode } from "react";

const ACCEPTED_MIME_TYPES = [
  MIMEType.TEXT_CSV,
  MIMEType.APPLICATION_MS_EXCEL,
  MIMEType.APPLICATION_OPENXML_EXCEL,
  MIMEType.APPLICATION_PDF,
].join(",");

type Props = {
  file: File;

  /** What the file was read as, which decides the mark shown beside it. */
  sourceType: DatasetSource.SourceType;

  /** Called with a replacement file. Parsing restarts immediately. */
  onReplace: (file: File) => void;

  /** True while a file is being read, which disables replacing it. */
  isBusy: boolean;
};

/**
 * What the dropzone collapses into once a file has been read: the file's
 * identity, and the one action still available on it.
 *
 * Keeping the full dropzone on screen after a successful parse would leave
 * the largest target on the page pointing at a step already finished.
 */
export function UploadedFileBar({
  file,
  sourceType,
  onReplace,
  isBusy,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();

  return (
    <Group gap="sm" wrap="nowrap" className={css.uploadedFileBar}>
      <span className={css.uploadedFileBarIcon}>
        <DatasetSourceIcon sourceType={sourceType} size={18} />
      </span>
      <Text size="sm" fw={500} truncate className={css.uploadedFileBarName}>
        {file.name}
      </Text>
      <Text size="xs" c="dimmed" className={css.uploadedFileBarSize}>
        {formatFileSize(file.size, { locale: i18n.locale })}
      </Text>
      <FileButton
        accept={ACCEPTED_MIME_TYPES}
        onChange={(replacementFile) => {
          if (replacementFile) {
            onReplace(replacementFile);
          }
        }}
      >
        {(fileButtonProps) => {
          return (
            <Button
              {...fileButtonProps}
              variant="subtle"
              size="compact-sm"
              color="neutral"
              disabled={isBusy}
              aria-label={t`Replace the uploaded file`}
            >
              <Trans>Replace</Trans>
            </Button>
          );
        }}
      </FileButton>
    </Group>
  );
}
