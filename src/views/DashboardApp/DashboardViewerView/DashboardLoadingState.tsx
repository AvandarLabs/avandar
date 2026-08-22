import { Paper } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { LoadingOverlay, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

/** Shown while the dashboard's published datasets are still downloading. */
export function DashboardLoadingState(): ReactNode {
  return (
    <Paper p="xxl" maw={720} mx="auto" pos="relative">
      <LoadingOverlay visible />
      <Stack gap="xs">
        <Title order={2} fw={650}>
          <Trans>Loading dashboard datasets</Trans>
        </Title>
        <Text c="dimmed">
          <Trans>Preparing data for the visualizations…</Trans>
        </Text>
      </Stack>
    </Paper>
  );
}
