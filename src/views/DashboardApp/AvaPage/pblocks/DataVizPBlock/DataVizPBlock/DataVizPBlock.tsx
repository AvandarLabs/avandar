import { useMemo } from "react";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { useAvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import { useApplyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/useApplyDashboardFiltersToSql";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import { makeQueryAuthFromAvaPageMetadata } from "../makeQueryAuthFromAvaPageMetadata";
import { useRefreshDataVizColumnBindings } from "../useDataVizColumnBindings/useRefreshDataVizColumnBindings";
import { useResolvedDataVizBindings } from "../useResolvedDataVizBindings/useResolvedDataVizBindings";
import { DataVizContent } from "./DataVizContent";
import { useLocalFilterState } from "./useLocalFilterState";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { DataVizBindingProps } from "../makeSavedBindingsFromDataVizProps/makeSavedBindingsFromDataVizProps";
import type { NLQuery } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/NLQueryPField";
import type { WithPuckProps } from "@puckeditor/core";
import type { ReactElement } from "react";

/** Saved visualization with explicit legacy or stable binding ownership. */
export type Props = {
  nlQuery: NLQuery;
  vizType: VizConfig.Type;
} & DataVizBindingProps;

/** Renders a saved chart with its local and subscribed dashboard filters. */
export function DataVizPBlock(
  props: Readonly<WithPuckProps<Props & { id: string }>>,
): ReactElement {
  const metadata = useAvaPageMetadata(props.puck);
  const auth = makeQueryAuthFromAvaPageMetadata(metadata);
  const bindings = useResolvedDataVizBindings({ props: props, auth: auth });
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
  useRefreshDataVizColumnBindings({
    id: props.id,
    rawSql: props.nlQuery.rawSql,
    auth,
    expectedSql: filteredSql,
    result,
    isSuccess:
      query.isSuccess &&
      query.fetchStatus === "idle" &&
      bindings.status === "ready",
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
