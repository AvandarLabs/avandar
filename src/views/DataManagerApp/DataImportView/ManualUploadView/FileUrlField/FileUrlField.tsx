import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { useId } from "react";
import css from "@/views/DataManagerApp/DataImportView/ManualUploadView/FileUrlField/FileUrlField.module.css";
import type { FileUrlStatus } from "@/views/DataManagerApp/DataImportView/ManualUploadView/useFileUrlImport/useFileUrlImport";
import type { ReactNode, RefObject } from "react";

type Props = {
  url: string;
  errorMessage: string | undefined;
  isBusy: boolean;
  status: FileUrlStatus | undefined;
  fieldRef: RefObject<HTMLInputElement | null>;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
};

/**
 * The other way onto the upload page: paste a link instead of choosing a
 * file. Submitting starts the download. A refusal stays on the field.
 */
export function FileUrlField({
  url,
  errorMessage,
  isBusy,
  status,
  fieldRef,
  onUrlChange,
  onSubmit,
}: Readonly<Props>): ReactNode {
  const fieldId = useId();

  return (
    <Stack gap={4}>
      <Text component="label" htmlFor={fieldId} size="sm" fw={500}>
        <Trans>Or provide a link to a file</Trans>
      </Text>
      <Group align="flex-start" gap="xs" wrap="nowrap">
        <TextInput
          id={fieldId}
          ref={fieldRef}
          className={css.linkField}
          placeholder="https://"
          value={url}
          disabled={isBusy}
          error={errorMessage}
          aria-invalid={errorMessage !== undefined}
          onChange={(event) => {
            onUrlChange(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <Button
          variant="light"
          loading={isBusy}
          disabled={isBusy}
          onClick={onSubmit}
        >
          <Trans>Add</Trans>
        </Button>
      </Group>
      {status ? <FileUrlStatusLine status={status} /> : null}
    </Stack>
  );
}

function FileUrlStatusLine({ status }: { status: FileUrlStatus }): ReactNode {
  if (status.fileName) {
    return (
      <Text size="sm">
        <Trans>
          Getting {status.fileName} from {status.sourceLabel}
        </Trans>
      </Text>
    );
  }
  return (
    <Text size="sm">
      <Trans>Downloading from {status.sourceLabel}</Trans>
    </Text>
  );
}
