import { Box, Group, Stack, Text } from "@mantine/core";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";

type Props = {
  summary: ColumnSummary & { type: "number" };
  totalRows: number;
  dataType: string;
};

/**
 * Visual block for numeric columns. A min→max range bar with the
 * average plotted as a marker tick. Communicates "where does the
 * average sit inside the range" — the question analysts most often
 * have looking at a fresh numeric column.
 */
export function NumberColumnSummary({ summary, dataType }: Props): JSX.Element {
  const { minValue, maxValue, averageValue, stdDev } = summary;
  const range = maxValue - minValue;
  const avgPct =
    range > 0 ?
      Math.max(0, Math.min(1, (averageValue - minValue) / range))
    : 0.5;
  const stdLeftPct =
    range > 0 ?
      Math.max(0, ((averageValue - stdDev - minValue) / range) * 100)
    : 0;
  const stdRightPct =
    range > 0 ?
      Math.min(100, ((averageValue + stdDev - minValue) / range) * 100)
    : 100;

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        Range
      </Text>

      <Box pos="relative" h={48} px={8}>
        <Box
          pos="absolute"
          top={20}
          left={0}
          right={0}
          h={4}
          bg="neutral.1"
          style={{ borderRadius: 2 }}
        />
        {Number.isFinite(stdDev) && stdDev > 0 ?
          <Box
            pos="absolute"
            top={18}
            h={8}
            bg="primary.1"
            style={{
              left: `${stdLeftPct}%`,
              width: `${Math.max(0, stdRightPct - stdLeftPct)}%`,
              borderRadius: 4,
            }}
            aria-label="One standard deviation around the mean"
          />
        : null}
        <Box
          pos="absolute"
          top={14}
          h={16}
          w={3}
          bg="primary.7"
          style={{
            left: `calc(${avgPct * 100}% - 1.5px)`,
            borderRadius: 1,
          }}
          aria-label="Mean"
        />

        <Group
          justify="space-between"
          pos="absolute"
          left={0}
          right={0}
          top={32}
          gap={0}
        >
          <Text size="xs" c="dimmed" ff="monospace">
            {_fmt(minValue)}
          </Text>
          <Text size="xs" c="dimmed" ff="monospace">
            {_fmt(maxValue)}
          </Text>
        </Group>
      </Box>

      <Group gap="lg" mt="xs">
        <Stat label="min" value={_fmt(minValue)} />
        <Stat label="avg" value={_fmt(averageValue)} accent />
        <Stat label="max" value={_fmt(maxValue)} />
        {Number.isFinite(stdDev) ?
          <Stat label="stddev" value={_fmt(stdDev)} />
        : null}
        <Stat
          label="kind"
          value={dataType === "bigint" ? "integer" : "decimal"}
        />
      </Group>
    </Stack>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}): JSX.Element {
  return (
    <Stack gap={0}>
      <Text
        size="sm"
        fw={accent ? 700 : 600}
        c={accent ? "primary.7" : "neutral.9"}
        ff="monospace"
      >
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Stack>
  );
}

function _fmt(n: number): string {
  if (!Number.isFinite(n)) {
    return "–";
  }
  if (Math.abs(n) >= 10_000) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
