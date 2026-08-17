import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  onRestart: () => void;
};

/**
 * Lets a user replay the onboarding tutorial.
 *
 * A restart deliberately replays all four milestones rather than skipping the
 * ones the workspace already satisfies: someone who asks to see the tutorial
 * again wants the tutorial, not "you are already done".
 */
export function TutorialSection({ onRestart }: Readonly<Props>): ReactNode {
  return (
    <Stack gap="xs">
      <Title order={3} size="h5">
        <Trans>Tutorial</Trans>
      </Title>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text c="dimmed" size="sm">
          <Trans>
            Walk through building and sharing a dashboard again, from the top.
          </Trans>
        </Text>
        <Button variant="default" onClick={onRestart}>
          <Trans>Restart tutorial</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
