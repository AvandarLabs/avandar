import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { TextFrequencyBar } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/TextFrequencyBar";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { ReactNode } from "react";

type Props = {
  summary: ColumnSummary & { type: "text" };
  totalRows: number;
};

/**
 * Visual block for text columns. Shows the most-common value(s) as a
 * tinted horizontal bar with the share-of-rows; ties produce stacked
 * rows. Deliberately not a chart: a single bar reads faster than a
 * donut for "how dominant is the top value."
 */
export function TextColumnSummary({ summary, totalRows }: Props): ReactNode {
  const top = summary.mostCommonValue;
  if (totalRows === 0 || top.count === 0 || top.value.length === 0) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        <Trans>No frequency data available.</Trans>
      </Text>
    );
  }

  const share = top.count / totalRows;
  const formattedShare = `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}%`;

  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        <Trans>Most common</Trans>
      </Text>
      <Stack gap={4}>
        {top.value.slice(0, 5).map((value) => {
          return (
            <TextFrequencyBar
              key={value}
              label={value}
              share={share}
              shareLabel={formattedShare}
              count={top.count}
            />
          );
        })}
        {top.value.length > 5 ? (
          <Text size="xs" c="dimmed" mt={4}>
            <Trans>
              +{top.value.length - 5} more values tied at{" "}
              {top.count.toLocaleString()} rows
            </Trans>
          </Text>
        ) : null}
      </Stack>
    </Stack>
  );
}
