import { WithPuckProps } from "@puckeditor/core";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { applyVizConfigFromQueryResult } from "$/models/vizs/applyVizConfigFromQueryResult/applyVizConfigFromQueryResult";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { DataVizContent } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizContent";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import { useLocalFilterState } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";
import { NLQuery } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/NLQueryPField";
import { useAvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import { useApplyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/useApplyDashboardFiltersToSql";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import type { DataVizFilterProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState";
import type { AvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { ReactElement } from "react";

export type Props = {
  /** Natural-language prompt + generated SQL configured by the editor. */
  nlQuery: NLQuery;

  /**
   * The active visualization type. Kept in sync with `vizConfig.vizType` by
   * the Puck `resolveData` hook so it can drive the type-picker control
   * separately from the per-type sub-config.
   */
  vizType: VizConfig.Type;

  /**
   * The full per-type viz config (axis selections, legend toggle, colors,
   * etc.) that gets passed straight to `VisualizationContainer`.
   */
  vizConfig: VizConfig.T;
} & DataVizFilterProps;

type DataVizQueryState = {
  columns: QueryResult.Column[];
  data: UnknownDataFrame;
  emptyStructuredQuery: ReturnType<typeof StructuredQuery.makeEmpty>;
  isLoading: boolean;
};

function _getDataVizQueryAuth(
  metadata: Readonly<AvaPageMetadata>,
): StructuredQueryAuth {
  return match(metadata)
    .with({ auth: "workspace" }, ({ workspaceId }) => {
      return { auth: "workspace" as const, workspaceId };
    })
    .with({ auth: "public" }, ({ dashboardId, snapshotRevision }) => {
      return {
        auth: "public" as const,
        publicAvaPageId: dashboardId,
        snapshotRevision,
      };
    })
    .with(
      { auth: "workspace_published" },
      ({ dashboardId, snapshotRevision }) => {
        return {
          auth: "workspace_published" as const,
          publicAvaPageId: dashboardId,
          snapshotRevision,
        };
      },
    )
    .exhaustive();
}

function useDataVizQuery(
  options: Readonly<{
    filteredSql: string;
    puck: WithPuckProps<Props>["puck"];
  }>,
): DataVizQueryState {
  const metadata = useAvaPageMetadata(options.puck);
  const emptyStructuredQuery = useMemo(() => {
    return StructuredQuery.makeEmpty();
  }, []);
  const queryAuth = _getDataVizQueryAuth(metadata);
  const [queryResults, isLoading] = useDataQuery({
    query: emptyStructuredQuery,
    rawSql: options.filteredSql,
    ...queryAuth,
  });
  // Memoized separately rather than returned as fresh literals: both are
  // dependencies of the `displayVizConfig` memo and props of
  // `VisualizationContainer`, so a new `[]` on every render would defeat both.
  const columns = useMemo(() => {
    return queryResults?.columns ?? [];
  }, [queryResults?.columns]);
  const data = useMemo(() => {
    return queryResults?.data ?? [];
  }, [queryResults?.data]);
  return { columns, data, emptyStructuredQuery, isLoading };
}

type DataVizDisplayState = DataVizQueryState & {
  dateColumns: ReadonlySet<string>;
  displayVizConfig: VizConfig.T;
};

type DataVizDisplayOptions = {
  filteredSql: string;
  puck: WithPuckProps<Props>["puck"];
  rawSql: string;
  vizConfig: VizConfig.T;
};

function useDataVizDisplayState(
  options: Readonly<DataVizDisplayOptions>,
): DataVizDisplayState {
  const queryState = useDataVizQuery({
    filteredSql: options.filteredSql,
    puck: options.puck,
  });
  const dateColumns = getDateColumns(queryState.columns, queryState.data);
  // Depends on the individual stable values, not on `queryState`: that object
  // is rebuilt on every render, so depending on it would recompute the memo
  // every render and hand `VisualizationContainer` a new `VizConfig.T` each
  // time.
  const { columns, emptyStructuredQuery } = queryState;
  const displayVizConfig = useMemo(() => {
    if (columns.length === 0) {
      return options.vizConfig;
    }
    return applyVizConfigFromQueryResult({
      vizConfig: options.vizConfig,
      rawSql: options.rawSql,
      query: emptyStructuredQuery,
      columns,
    });
  }, [options.rawSql, options.vizConfig, emptyStructuredQuery, columns]);
  return { ...queryState, dateColumns, displayVizConfig };
}

function useDataVizFilterProps(
  options: Readonly<{
    globalFilterSubscription: Props["globalFilterSubscription"];
    localFilters: Props["localFilters"];
  }>,
): DataVizFilterProps {
  return useMemo(() => {
    return {
      globalFilterSubscription:
        options.globalFilterSubscription ??
        DataVizFilters.defaultGlobalFilterSubscription,
      localFilters:
        options.localFilters ??
        DataVizFilters.defaultDataVizFilterProps.localFilters,
    };
  }, [options.globalFilterSubscription, options.localFilters]);
}

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
}: Readonly<WithPuckProps<Props>>): ReactElement {
  const { prompt, rawSql } = nlQuery;
  const filterProps = useDataVizFilterProps({
    globalFilterSubscription,
    localFilters,
  });

  const localFilterState = useLocalFilterState(filterProps.localFilters);

  const filteredSql = useApplyDashboardFiltersToSql({
    rawSql,
    filterProps,
    localFilters: filterProps.localFilters,
    localFilterState,
  });

  const { columns, data, dateColumns, displayVizConfig, isLoading } =
    useDataVizDisplayState({
      filteredSql,
      puck,
      vizConfig,
      rawSql,
    });

  return (
    <DataVizContent
      prompt={prompt}
      rawSql={rawSql}
      isLoading={isLoading}
      columns={columns}
      data={data}
      dateColumns={dateColumns}
      displayVizConfig={displayVizConfig}
      filterProps={filterProps}
      localFilterState={localFilterState}
    />
  );
}
