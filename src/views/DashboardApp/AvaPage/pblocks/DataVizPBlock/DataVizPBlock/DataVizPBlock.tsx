import { Trans } from "@lingui/react/macro";
import { Box, LoadingOverlay, Stack, Text } from "@mantine/core";
import { WithPuckProps } from "@puckeditor/core";
import { Paper } from "@ui";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { applyVizConfigFromQueryResult } from "$/models/vizs/applyVizConfigFromQueryResult";
import { useMemo } from "react";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { DataVizLocalFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizLocalFilters";
import {
  DEFAULT_DATA_VIZ_FILTER_PROPS,
  DEFAULT_GLOBAL_FILTER_SUBSCRIPTION,
  useLocalFilterState,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";
import { NLQuery } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/NLQueryPField";
import { useAvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import { useApplyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/useApplyDashboardFiltersToSql";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";
import type { DataVizFilterProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";
import type {
  VizConfig,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types";

type Props = {
  /** Natural-language prompt + generated SQL configured by the editor. */
  nlQuery: NLQuery;

  /**
   * The active visualization type. Kept in sync with `vizConfig.vizType` by
   * the Puck `resolveData` hook so it can drive the type-picker control
   * separately from the per-type sub-config.
   */
  vizType: VizType;

  /**
   * The full per-type viz config (axis selections, legend toggle, colors,
   * etc.) that gets passed straight to `VisualizationContainer`.
   */
  vizConfig: VizConfig;
} & DataVizFilterProps;

export { type Props as DataVizPBlockProps };

/**
 * Dashboard Puck block that renders any visualization supported by the shared
 * `VisualizationContainer` (table, bar, line, area, scatter, pie, funnel,
 * radar, bubble) for a natural-language SQL query.
 *
 * Acts as a small adapter that turns the block's persisted props
 * (`nlQuery` + `vizConfig`) into the props `VisualizationContainer` expects,
 * by running the generated SQL via `useDataQuery` and deriving date columns.
 */
export function DataVizPBlock({
  nlQuery,
  vizConfig,
  globalFilterSubscription,
  localFilters,
  puck,
}: WithPuckProps<Props>): JSX.Element {
  const { prompt, rawSql } = nlQuery;
  const metadata = useAvaPageMetadata(puck);

  const filterProps: DataVizFilterProps = useMemo(() => {
    return {
      globalFilterSubscription:
        globalFilterSubscription ?? DEFAULT_GLOBAL_FILTER_SUBSCRIPTION,
      localFilters: localFilters ?? DEFAULT_DATA_VIZ_FILTER_PROPS.localFilters,
    };
  }, [globalFilterSubscription, localFilters]);

  const localFilterState = useLocalFilterState(filterProps.localFilters);

  const filteredSql = useApplyDashboardFiltersToSql(rawSql, {
    filterProps,
    localFilters: filterProps.localFilters,
    localFilterState,
  });

  const emptyStructuredQuery = useMemo(() => {
    return StructuredQuery.makeEmpty();
  }, []);

  const [queryResults, isLoadingResults] = useDataQuery({
    query: emptyStructuredQuery,
    rawSQL: filteredSql,
    ...(metadata.auth === "workspace" ?
      {
        auth: "workspace" as const,
        workspaceId: metadata.workspaceId,
      }
    : {
        auth: "public" as const,
        publicAvaPageId: metadata.dashboardId,
      }),
  });

  const columns = useMemo(() => {
    return queryResults?.columns ?? [];
  }, [queryResults?.columns]);
  const data = useMemo(() => {
    return queryResults?.data ?? [];
  }, [queryResults?.data]);
  const dateColumns = getDateColumns(columns, data);

  const displayVizConfig = useMemo(() => {
    if (columns.length === 0) {
      return vizConfig;
    }
    return applyVizConfigFromQueryResult({
      vizConfig,
      rawSQL: rawSql,
      query: emptyStructuredQuery,
      columns,
    });
  }, [vizConfig, rawSql, emptyStructuredQuery, columns]);

  if (prompt.length === 0) {
    return (
      <Paper withBorder p="md">
        <Text c="dimmed" fz="sm">
          <Trans>
            Add a prompt and generate SQL to configure this visualization.
          </Trans>
        </Text>
      </Paper>
    );
  }

  if (rawSql.trim().length === 0) {
    return (
      <Paper withBorder p="md">
        <Text c="dimmed" fz="sm">
          <Trans>Run a query to see results.</Trans>
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
        <DataVizLocalFilters
          localFilters={filterProps.localFilters}
          state={localFilterState}
        />
        <Box pos="relative" w="100%" h={420}>
          <LoadingOverlay visible={isLoadingResults} zIndex={10} />
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
