import { Trans, useLingui } from "@lingui/react/macro";
import { Box, Group, Stack, Text } from "@mantine/core";
import { formatNumber } from "@utils";
import { NumberColumnStat } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/NumberColumnStat";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { ReactNode } from "react";

type Props = {
  summary: ColumnSummary & { type: "number" };
  totalRows: number;
  dataType: string;
};

function _formatCompactNumber(n: number): string {
  if (!Number.isFinite(n)) {
    return "–";
  }
  if (Math.abs(n) >= 10_000) {
    return formatNumber(n, { maximumFractionDigits: 0 });
  }
  if (Number.isInteger(n)) {
    return formatNumber(n, { maximumFractionDigits: 0, useGrouping: false });
  }
  return formatNumber(n, { maximumFractionDigits: 2 });
}

/**
 * Visual block for numeric columns. A min→max range bar with the
 * average plotted as a marker tick. Communicates "where does the
 * average sit inside the range": the question analysts most often
 * have looking at a fresh numeric column.
 */
export function NumberColumnSummary({ summary, dataType }: Props): ReactNode {
  const { t } = useLingui();
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
        <Trans>Range</Trans>
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
            aria-label={t`One standard deviation around the mean`}
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
          aria-label={t`Mean`}
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
            {_formatCompactNumber(minValue)}
          </Text>
          <Text size="xs" c="dimmed" ff="monospace">
            {_formatCompactNumber(maxValue)}
          </Text>
        </Group>
      </Box>

      <Group gap="lg" mt="xs">
        <NumberColumnStat
          label={t`min`}
          value={_formatCompactNumber(minValue)}
        />
        <NumberColumnStat
          label={t`avg`}
          value={_formatCompactNumber(averageValue)}
          accent
        />
        <NumberColumnStat
          label={t`max`}
          value={_formatCompactNumber(maxValue)}
        />
        {Number.isFinite(stdDev) ?
          <NumberColumnStat
            label={t`stddev`}
            value={_formatCompactNumber(stdDev)}
          />
        : null}
        <NumberColumnStat
          label={t`kind`}
          value={dataType === "bigint" ? t`integer` : t`decimal`}
        />
      </Group>
    </Stack>
  );
}
