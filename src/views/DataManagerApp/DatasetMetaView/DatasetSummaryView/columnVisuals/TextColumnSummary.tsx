import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { TextFrequencyBar } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/TextFrequencyBar";
import { formatColumnShare } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/formatColumnShare";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { ReactNode } from "react";

const MAX_BARS = 5;

type Props = {
  summary: ColumnSummary & { type: "text" };
  totalRows: number;
};

/**
 * Visual block for text columns. Shows the most-common value(s) as a
 * tinted horizontal bar with the share-of-rows; ties produce stacked
 * rows. Deliberately not a chart: a single bar reads faster than a
 * donut for "how dominant is the top value."
 *
 * It carries no heading of its own. The sentence directly above already
 * names what these bars are, and labelling them again was the same fact
 * stated twice in eight lines.
 */
export function TextColumnSummary({ summary, totalRows }: Props): ReactNode {
  const { i18n } = useLingui();
  const top = summary.mostCommonValue;
  if (totalRows === 0 || top.count === 0 || top.value.length === 0) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        <Trans>No frequency data available.</Trans>
      </Text>
    );
  }

  const share = top.count / totalRows;
  const formattedShare = formatColumnShare(share, i18n.locale);

  return (
    <Stack gap={6}>
      {top.value.slice(0, MAX_BARS).map((value) => {
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
      {top.value.length > MAX_BARS ? (
        <Text size="xs" c="dimmed">
          <Trans>
            +{top.value.length - MAX_BARS} more values tied at{" "}
            {top.count.toLocaleString(i18n.locale)} rows
          </Trans>
        </Text>
      ) : null}
    </Stack>
  );
}
