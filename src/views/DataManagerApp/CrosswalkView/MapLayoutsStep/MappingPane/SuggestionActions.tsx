import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  columnName: string;
  onAccept: () => void;
  onReject: () => void;
};

/**
 * Accept or Reject a suggested fill. Each button's name says which column
 * it acts on and starts with its visible word, so a voice user can say what
 * they see.
 */
export function SuggestionActions({
  columnName,
  onAccept,
  onReject,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <Stack gap={6}>
      <Text size="xs" c="dimmed">
        <Trans>
          This fill is a suggestion. Accept it, change it, or reject it.
        </Trans>
      </Text>
      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          aria-label={t`Accept the suggestion for ${columnName}`}
          onClick={onAccept}
        >
          <Trans>Accept</Trans>
        </Button>
        <Button
          size="xs"
          variant="default"
          aria-label={t`Reject the suggestion for ${columnName}`}
          onClick={onReject}
        >
          <Trans>Reject</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
