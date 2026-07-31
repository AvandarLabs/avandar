import { Trans, useLingui } from "@lingui/react/macro";
import {
  Badge,
  Box,
  Code,
  Group,
  RingProgress,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DateColumnSummary } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/DateColumnSummary";
import { NumberColumnSummary } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/NumberColumnSummary";
import { TextColumnSummary } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/TextColumnSummary";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

type Props = {
  datasetId: DatasetId;
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
}: Props): JSX.Element {
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

  return (
    <Stack gap="md">
      <Text size="sm" c="neutral.7" lh={1.6}>
        {sentence}
      </Text>

      <Group gap="lg" align="center" wrap="wrap">
        <Stat label={t`Distinct values`}>
          <Text fw={650} size="xl" lh={1}>
            {summary.distinctValuesCount.toLocaleString()}
          </Text>
        </Stat>
        {missingPct > 0 ?
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
        : null}
      </Group>

      <_TypeSwitch
        summary={summary}
        totalRows={totalRows}
        dataType={dataType}
      />
    </Stack>
  );
}

function _TypeSwitch({
  summary,
  totalRows,
  dataType,
}: {
  summary: ColumnSummary;
  totalRows: number;
  dataType: string;
}): JSX.Element | null {
  if (summary.type === "text") {
    return <TextColumnSummary summary={summary} totalRows={totalRows} />;
  }
  if (summary.type === "number") {
    return (
      <NumberColumnSummary
        summary={summary}
        totalRows={totalRows}
        dataType={dataType}
      />
    );
  }
  if (summary.type === "date") {
    return <DateColumnSummary summary={summary} totalRows={totalRows} />;
  }
  return null;
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Stack gap={0}>
      {children}
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Stack>
  );
}

/**
 * Build a single one-sentence summary that reads like a doc paragraph,
 * not a list of stats. The intent: lead with what the analyst actually
 * cares about, then show the chart-y bits below as supporting evidence.
 *
 * Examples (intentionally varied):
 *   - "Mostly unique — 4,200 distinct values across 4,205 rows."
 *   - "Heavily repeated — `Lagos` shows up in 87% of rows."
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
        Ranges from <Tag>{numericLow}</Tag> to <Tag>{numericHigh}</Tag>,
        averaging <Tag>{avg}</Tag>
        {Number.isFinite(summary.stdDev) ?
          <>
            {" "}
            with a standard deviation of <Tag>{_fmtNum(summary.stdDev)}</Tag>.
          </>
        : "."}
      </Trans>
    );
  }

  if (summary.type === "date") {
    return (
      <Trans>
        Covers <Tag>{summary.datasetCoverage}</Tag>, from{" "}
        <Tag>{summary.oldestDate || "earliest"}</Tag> through{" "}
        <Tag>{summary.mostRecentDate || "latest"}</Tag>.
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
          Heavily repeated: <Tag>{top.value.slice(0, 1).join(", ")}</Tag>{" "}
          appears in <Tag>{(share * 100).toFixed(0)}%</Tag> of rows.
        </Trans>
      );
    }
    if (summary.distinctValuesCount >= Math.max(1, totalRows * 0.9)) {
      return (
        <Trans>
          Mostly unique:{" "}
          <Tag>{summary.distinctValuesCount.toLocaleString()}</Tag> distinct
          values across <Tag>{totalRows.toLocaleString()}</Tag> rows.
        </Trans>
      );
    }
    return (
      <Trans>
        Most common value: <Tag>{top.value.slice(0, 2).join(", ")}</Tag> (
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

function Tag({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <Box
      component="span"
      bg="neutral.0"
      style={{
        padding: "1px 6px",
        borderRadius: 4,
        fontFamily: "var(--mantine-font-family-monospace)",
        fontSize: "0.92em",
      }}
    >
      {children}
    </Box>
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
export { Badge, Code };
