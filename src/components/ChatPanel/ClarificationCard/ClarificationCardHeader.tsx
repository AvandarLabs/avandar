import { Trans } from "@lingui/react/macro";
import { Group, Stack, Text } from "@mantine/core";
import { IconHelp } from "@tabler/icons-react";
import css from "./ClarificationCard.module.css";

type Props = {
  question: string;
  rationale?: string;
  turnNumber: number;
};

/** Renders the question and progress metadata for a clarification request. */
export function ClarificationCardHeader({
  question,
  rationale,
  turnNumber,
}: Readonly<Props>): React.ReactNode {
  return (
    <Group gap="xs" align="flex-start">
      <IconHelp
        size={16}
        color="var(--mantine-color-blue-6)"
        className={css.clarificationCardIcon}
      />
      <Stack gap={2} className={css.clarificationCardContent}>
        <Text size="sm" fw={600}>
          {question}
        </Text>
        {rationale ? (
          <Text size="xs" c="dimmed">
            {rationale}
          </Text>
        ) : null}
        <Text size="xs" c="dimmed">
          <Trans>Clarification {turnNumber} of 3</Trans>
        </Text>
      </Stack>
    </Group>
  );
}
