import { useMemo } from "react";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { useAvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import { useApplyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/useApplyDashboardFiltersToSql";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import { getDataVizQueryAuth } from "../getDataVizQueryAuth";
import { useResolvedDataVizBindings } from "../useResolvedDataVizBindings/useResolvedDataVizBindings";
import { DataVizContent } from "./DataVizContent";
import { useLocalFilterState } from "./useLocalFilterState";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { DataVizBindingProps } from "../resolveSavedDataVizBindings/resolveSavedDataVizBindings";
import type { NLQuery } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/NLQueryPField";
import type { WithPuckProps } from "@puckeditor/core";
import type { ReactElement } from "react";

/** Saved visualization with explicit legacy or stable binding ownership. */
export type Props = {
  nlQuery: NLQuery;
  vizType: VizConfig.Type;
} & DataVizBindingProps;

/**
 * Discovers identities before applying predicates and executing dashboard
 * SQL.
 */
export function DataVizPBlock(
  props: Readonly<WithPuckProps<Props & { id: string }>>,
): ReactElement {
  const metadata = useAvaPageMetadata(props.puck);
  const auth = getDataVizQueryAuth(metadata);
  const bindings = useResolvedDataVizBindings(props, auth);
  const localFilters = bindings.resolved?.localFilters ?? [];
  const localFilterState = useLocalFilterState(localFilters);
  const filteredSql = useApplyDashboardFiltersToSql({
    rawSql: props.nlQuery.rawSql,
    columns: bindings.schema?.columns,
    globalFilters: bindings.resolved?.global.resolvedFilters ?? [],
    localFilters,
    localFilterState,
  });
  const emptyQuery = useMemo(() => {
    return StructuredQuery.makeEmpty();
  }, []);
  const [result, isLoading, query] = useDataQuery({
    query: emptyQuery,
    rawSql: filteredSql,
    enabled: bindings.status === "ready",
    analyticsSurface: "dashboard_block",
    ...auth,
  });
  const columns = bindings.schema?.columns ?? [];
  const data = result?.data ?? [];
  return (
    <DataVizContent
      prompt={props.nlQuery.prompt}
      rawSql={props.nlQuery.rawSql}
      isLoading={isLoading || bindings.status === "loading"}
      columns={columns}
      rawColumns={result?.columns ?? []}
      data={data}
      dateColumns={getDateColumns(columns, data)}
      displayVizConfig={
        bindings.resolved?.runtimeConfig ??
        VizConfigs.makeEmptyConfig(props.vizType)
      }
      filterProps={{
        globalFilterSubscription: props.globalFilterSubscription,
        localFilters,
      }}
      localFilterState={localFilterState}
      queryErrorMessage={
        bindings.error?.message ??
        (query.isError ? query.error.message : undefined)
      }
    />
  );
}
