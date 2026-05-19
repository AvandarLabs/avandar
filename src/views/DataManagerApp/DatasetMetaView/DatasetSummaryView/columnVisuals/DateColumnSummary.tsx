import { Box, Group, Stack, Text } from "@mantine/core";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";

type Props = {
  summary: ColumnSummary & { type: "date" };
  totalRows: number;
};

/**
 * Visual block for date / time / timestamp columns. Horizontal timeline
 * with oldest on the left, most recent on the right, and the coverage
 * span labelled in the middle. Skips a chart on purpose — for a single
 * column the timeline is the clearest read.
 */
export function DateColumnSummary({ summary }: Props): JSX.Element {
  const { oldestDate, mostRecentDate, datasetCoverage } = summary;

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        Timespan
      </Text>

      <Box pos="relative" px={6}>
        <Box h={4} bg="neutral.1" style={{ borderRadius: 2 }} />
        <Box pos="absolute" top={-3} left={0}>
          <Endpoint position="start" />
        </Box>
        <Box pos="absolute" top={-3} right={0}>
          <Endpoint position="end" />
        </Box>
      </Box>

      <Group justify="space-between" gap="xs">
        <Stack gap={0} align="flex-start">
          <Text size="sm" fw={600} ff="monospace">
            {oldestDate || "—"}
          </Text>
          <Text size="xs" c="dimmed">
            earliest
          </Text>
        </Stack>
        <Stack gap={0} align="center">
          <Text size="sm" fw={600} c="primary.7">
            {datasetCoverage}
          </Text>
          <Text size="xs" c="dimmed">
            coverage
          </Text>
        </Stack>
        <Stack gap={0} align="flex-end">
          <Text size="sm" fw={600} ff="monospace">
            {mostRecentDate || "—"}
          </Text>
          <Text size="xs" c="dimmed">
            most recent
          </Text>
        </Stack>
      </Group>
    </Stack>
  );
}

function Endpoint({ position }: { position: "start" | "end" }): JSX.Element {
  return (
    <Box
      h={10}
      w={10}
      bg="primary.6"
      style={{
        borderRadius: "50%",
        boxShadow:
          position === "start" ?
            "0 0 0 3px var(--mantine-color-primary-0)"
          : "0 0 0 3px var(--mantine-color-primary-0)",
      }}
    />
  );
}
