import { Trans } from "@lingui/react/macro";
import { Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

/** The Label values step when no entry that was kept has codes. */
export function NothingToLabel(): ReactNode {
  return (
    <Stack align="center" gap="xs" py="xxl" maw={720} mx="auto" ta="center">
      <Title order={4} fz="lg" fw={650}>
        <Trans>Nothing to label</Trans>
      </Title>
      <Text size="sm" c="dimmed">
        <Trans>
          None of the entries you kept has codes. Go on to save, or go back and
          change an entry's kind.
        </Trans>
      </Text>
    </Stack>
  );
}
