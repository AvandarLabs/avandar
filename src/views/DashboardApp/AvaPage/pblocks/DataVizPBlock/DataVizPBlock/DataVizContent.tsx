import { Paper } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Box, LoadingOverlay, Stack, Text } from "@mantine/core";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { DataVizLocalFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizLocalFilters/DataVizLocalFilters";
import { QueryResultsError } from "@/views/DataExplorerApp/QueryResultsError/QueryResultsError";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type {
  DataVizFilterProps,
  useLocalFilterState,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ReactElement } from "react";

type Props = {
  prompt: string;
  rawSql: string;
  isLoading: boolean;
  columns: QueryResult.Column[];
  data: UnknownDataFrame;
  dateColumns: ReadonlySet<string>;
  displayVizConfig: VizConfig.T;
  filterProps: DataVizFilterProps;
  localFilterState: ReturnType<typeof useLocalFilterState>;
  /** Set when the block's query failed, so the block says so rather than
   * rendering an empty chart that reads like "no matching rows". */
  queryErrorMessage: string | undefined;
};

/**
 * The block's chart, or the reason there is nothing to chart yet.
 *
 * A missing prompt and an unrun query are different states and get different
 * copy, because the fix differs: write a prompt, or run what you wrote.
 */
export function DataVizContent({
  prompt,
  rawSql,
  isLoading,
  columns,
  data,
  dateColumns,
  displayVizConfig,
  filterProps,
  localFilterState,
  queryErrorMessage,
}: Readonly<Props>): ReactElement {
  const emptyMessage =
    prompt.length === 0 ? (
      <Trans>
        Add a prompt and generate SQL to configure this visualization.
      </Trans>
    ) : rawSql.trim().length === 0 ? (
      <Trans>Run a query to see results.</Trans>
    ) : undefined;

  if (emptyMessage !== undefined) {
    return (
      <Paper withBorder p="md">
        <Text c="dimmed" fz="sm">
          {emptyMessage}
        </Text>
      </Paper>
    );
  }

  return (
    <Paper
      withBorder
      p="lg"
      radius="md"
      style={{
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        backgroundColor: "var(--mantine-color-white)",
      }}
    >
      <Stack gap="sm">
        <QueryResultsError message={queryErrorMessage} sql={rawSql} />
        <DataVizLocalFilters
          localFilters={filterProps.localFilters}
          state={localFilterState}
        />
        <Box pos="relative" w="100%" h={420}>
          <LoadingOverlay visible={isLoading} zIndex={10} />
          <VisualizationContainer
            columns={columns}
            data={data}
            dateColumns={dateColumns}
            vizConfig={displayVizConfig}
          />
        </Box>
      </Stack>
    </Paper>
  );
}
