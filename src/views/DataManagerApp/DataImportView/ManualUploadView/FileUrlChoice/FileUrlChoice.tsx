import { formatFileSize } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Stack, Text, UnstyledButton } from "@mantine/core";
import css from "@/views/DataManagerApp/DataImportView/ManualUploadView/FileUrlChoice/FileUrlChoice.module.css";
import type { FileUrlChoiceMember } from "$/fileUrl/AcquiredPastedFile";
import type { ReactNode } from "react";

type Props = {
  members: readonly FileUrlChoiceMember[];
  errorMessage?: string;
  isBusy: boolean;
  onChoose: (member: FileUrlChoiceMember) => void;
  onUseDifferentLink: () => void;
};

/**
 * The stop a pasted link makes when it holds more than one data file.
 * Choosing a row imports that file. Anything that is not a CSV, Excel
 * workbook, or PDF is already left off the list.
 */
export function FileUrlChoice({
  members,
  errorMessage,
  isBusy,
  onChoose,
  onUseDifferentLink,
}: Readonly<Props>): ReactNode {
  const { i18n, t } = useLingui();

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        <Trans>Which file should Avandar import?</Trans>
      </Text>
      <Text size="xs" c="dimmed">
        <Trans>This link has more than one data file.</Trans>
      </Text>
      {errorMessage ? (
        <Text size="sm" c="red">
          {errorMessage}
        </Text>
      ) : null}
      {members.map((member) => {
        return (
          <UnstyledButton
            key={`${member.path}:${member.url ?? ""}`}
            className={css.choiceRow}
            disabled={isBusy}
            aria-label={t`Import ${member.path}`}
            onClick={() => {
              onChoose(member);
            }}
          >
            <Text size="sm" truncate className={css.choiceName}>
              {member.path}
            </Text>
            <Text size="xs" c="dimmed" className={css.choiceSize}>
              {formatFileSize(member.size, { locale: i18n.locale })}
            </Text>
          </UnstyledButton>
        );
      })}
      <Button variant="subtle" disabled={isBusy} onClick={onUseDifferentLink}>
        <Trans>Use a different link</Trans>
      </Button>
    </Stack>
  );
}
