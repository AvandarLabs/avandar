import type { ReactNode } from "react";

import { Paper } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Stack, Text, Title } from "@mantine/core";

/** Shown when one or more published datasets failed to download. */
export function DashboardLoadErrorState(): ReactNode {
  return (
    <Paper p="xxl" maw={720} mx="auto">
      <Stack gap="xs">
        <Title order={2} fw={650}>
          <Trans>Unable to load dashboard</Trans>
        </Title>
        <Text c="dimmed">
          <Trans>
            Some published datasets could not be loaded. Please try again later.
          </Trans>
        </Text>
      </Stack>
    </Paper>
  );
}
