import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Box, Group, Stack, Text } from "@mantine/core";

import { TimelineEndpoint } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/TimelineEndpoint";

type Props = {
  summary: ColumnSummary & { type: "date" };
  totalRows: number;
};

/**
 * Visual block for date / time / timestamp columns. Horizontal timeline
 * with oldest on the left, most recent on the right, and the coverage
 * span labelled in the middle. Skips a chart on purpose: for a single
 * column the timeline is the clearest read.
 */
export function DateColumnSummary({ summary }: Props): ReactNode {
  const { oldestDate, mostRecentDate, datasetCoverage } = summary;

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        <Trans>Timespan</Trans>
      </Text>

      <Box pos="relative" px={6}>
        <Box h={4} bg="neutral.1" style={{ borderRadius: 2 }} />
        <Box pos="absolute" top={-3} left={0}>
          <TimelineEndpoint />
        </Box>
        <Box pos="absolute" top={-3} right={0}>
          <TimelineEndpoint />
        </Box>
      </Box>

      <Group justify="space-between" gap="xs">
        <Stack gap={0} align="flex-start">
          <Text size="sm" fw={600} ff="monospace">
            {oldestDate || <Trans>Unavailable</Trans>}
          </Text>
          <Text size="xs" c="dimmed">
            <Trans>earliest</Trans>
          </Text>
        </Stack>
        <Stack gap={0} align="center">
          <Text size="sm" fw={600} c="primary.7">
            {datasetCoverage}
          </Text>
          <Text size="xs" c="dimmed">
            <Trans>coverage</Trans>
          </Text>
        </Stack>
        <Stack gap={0} align="flex-end">
          <Text size="sm" fw={600} ff="monospace">
            {mostRecentDate || <Trans>Unavailable</Trans>}
          </Text>
          <Text size="xs" c="dimmed">
            <Trans>most recent</Trans>
          </Text>
        </Stack>
      </Group>
    </Stack>
  );
}
