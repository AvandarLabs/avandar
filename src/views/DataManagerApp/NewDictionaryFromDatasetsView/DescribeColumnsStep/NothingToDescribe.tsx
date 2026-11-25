import { Trans } from "@lingui/react/macro";
import { Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

/** The Describe columns step when no entry is included. */
export function NothingToDescribe(): ReactNode {
  return (
    <Stack align="center" gap="xs" py="xxl" maw={720} mx="auto" ta="center">
      <Title order={4} fz="lg" fw={650}>
        <Trans>Nothing to describe</Trans>
      </Title>
      <Text size="sm" c="dimmed">
        <Trans>
          No columns are checked, so the dictionary would be empty. Go back and
          check the columns it should hold.
        </Trans>
      </Text>
    </Stack>
  );
}
