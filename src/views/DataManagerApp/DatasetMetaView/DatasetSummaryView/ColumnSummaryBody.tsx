import { Trans, useLingui } from "@lingui/react/macro";
import { Group, RingProgress, Skeleton, Stack, Text } from "@mantine/core";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DateColumnSummary } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/DateColumnSummary";
import { NumberColumnSummary } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/NumberColumnSummary";
import { TextColumnSummary } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/TextColumnSummary";
import { SummaryTag } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/SummaryTag";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
  columnName: string;
  dataType: string;
  totalRows: number;
};

/**
 * Fetches the single-column summary on demand (one batch of small SQL
 * queries: distinct count, missing count, most common value(s), and the
 * type-specific stats) and renders the type-appropriate visualisation
 * below it.
 *
 * The visualisations live in three siblings (TextColumnSummary,
 * NumberColumnSummary, DateColumnSummary) so the per-type rendering
 * stays focused and the renderer doesn't grow a sprawling switch.
 */
export function ColumnSummaryBody({
  datasetId,
  columnName,
  dataType,
  totalRows,
}: Props): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [summary, isLoading, query] = DatasetQueryClient.useGetColumnSummary({
    datasetId,
    workspaceId: workspace.id,
    columnName,
    dataType,
    useQueryOptions: {
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  });

  if (isLoading) {
    return (
      <Stack gap="sm">
        <Skeleton height={20} width="70%" />
        <Skeleton height={56} />
      </Stack>
    );
  }

  if (query.isError || !summary) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        <Trans>
          Could not summarize this column. The query may have failed for an
          unsupported value or a malformed cell.
        </Trans>
      </Text>
    );
  }

  const sentence = _buildHeadlineSentence({ summary, totalRows });
  const missingPct = totalRows > 0 ? summary.emptyValuesCount / totalRows : 0;

  const typeSummary =
    summary.type === "text" ? (
      <TextColumnSummary summary={summary} totalRows={totalRows} />
    ) : summary.type === "number" ? (
      <NumberColumnSummary
        summary={summary}
        totalRows={totalRows}
        dataType={dataType}
      />
    ) : summary.type === "date" ? (
      <DateColumnSummary summary={summary} totalRows={totalRows} />
    ) : null;

  return (
    <Stack gap="md">
      <Text size="sm" c="neutral.7" lh={1.6}>
        {sentence}
      </Text>

      <Group gap="lg" align="center" wrap="wrap">
        <Stack gap={0}>
          <Text fw={650} size="xl" lh={1}>
            {summary.distinctValuesCount.toLocaleString()}
          </Text>
          <Text size="xs" c="dimmed">
            {t`Distinct values`}
          </Text>
        </Stack>
        {missingPct > 0 ? (
          <Group gap="xs" align="center">
            <RingProgress
              size={48}
              thickness={5}
              roundCaps
              sections={[
                {
                  value: missingPct * 100,
                  color: missingPct > 0.2 ? "yellow.6" : "neutral.4",
                },
              ]}
            />
            <Stack gap={0}>
              <Text fw={650} size="sm" lh={1}>
                {(missingPct * 100).toFixed(missingPct < 0.01 ? 2 : 1)}%
              </Text>
              <Text size="xs" c="dimmed">
                <Trans>missing</Trans>
              </Text>
            </Stack>
          </Group>
        ) : null}
      </Group>

      {typeSummary}
    </Stack>
  );
}

/**
 * Build a single one-sentence summary that reads like a doc paragraph,
 * not a list of stats. The intent: lead with what the analyst actually
 * cares about, then show the chart-y bits below as supporting evidence.
 *
 * Examples (intentionally varied):
 *   - "Mostly unique: 4,200 distinct values across 4,205 rows."
 *   - "Heavily repeated: `Lagos` shows up in 87% of rows."
 *   - "Ranges from 0 to 412, averaging 38 with a stddev of 64."
 *   - "Covers 412 days, from 2023-01-04 through 2024-02-19."
 */
function _buildHeadlineSentence(args: {
  summary: ColumnSummary;
  totalRows: number;
}): React.ReactNode {
  const { summary, totalRows } = args;

  if (summary.type === "number") {
    const numericLow = _fmtNum(summary.minValue);
    const numericHigh = _fmtNum(summary.maxValue);
    const avg = _fmtNum(summary.averageValue);
    return (
      <Trans>
        Ranges from <SummaryTag>{numericLow}</SummaryTag> to{" "}
        <SummaryTag>{numericHigh}</SummaryTag>, averaging{" "}
        <SummaryTag>{avg}</SummaryTag>
        {Number.isFinite(summary.stdDev) ? (
          <>
            {" "}
            with a standard deviation of{" "}
            <SummaryTag>{_fmtNum(summary.stdDev)}</SummaryTag>.
          </>
        ) : (
          "."
        )}
      </Trans>
    );
  }

  if (summary.type === "date") {
    return (
      <Trans>
        Covers <SummaryTag>{summary.datasetCoverage}</SummaryTag>, from{" "}
        <SummaryTag>{summary.oldestDate || "earliest"}</SummaryTag> through{" "}
        <SummaryTag>{summary.mostRecentDate || "latest"}</SummaryTag>.
      </Trans>
    );
  }

  // text path
  const top = summary.mostCommonValue;
  if (totalRows > 0 && top.count > 0) {
    const share = top.count / totalRows;
    if (share >= 0.5) {
      return (
        <Trans>
          Heavily repeated:{" "}
          <SummaryTag>{top.value.slice(0, 1).join(", ")}</SummaryTag> appears in{" "}
          <SummaryTag>{(share * 100).toFixed(0)}%</SummaryTag> of rows.
        </Trans>
      );
    }
    if (summary.distinctValuesCount >= Math.max(1, totalRows * 0.9)) {
      return (
        <Trans>
          Mostly unique:{" "}
          <SummaryTag>
            {summary.distinctValuesCount.toLocaleString()}
          </SummaryTag>{" "}
          distinct values across{" "}
          <SummaryTag>{totalRows.toLocaleString()}</SummaryTag> rows.
        </Trans>
      );
    }
    return (
      <Trans>
        Most common value:{" "}
        <SummaryTag>{top.value.slice(0, 2).join(", ")}</SummaryTag> (
        {top.count.toLocaleString()} rows, {(share * 100).toFixed(0)}%).
      </Trans>
    );
  }

  return (
    <Text size="sm" c="dimmed" fs="italic">
      <Trans>No values to summarize.</Trans>
    </Text>
  );
}

function _fmtNum(n: number): string {
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

export type { ColumnSummary };
