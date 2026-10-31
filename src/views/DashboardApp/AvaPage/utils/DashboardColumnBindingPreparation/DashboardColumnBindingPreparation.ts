import { makeIdLookupMap, matchLiteral } from "@avandar/utils";
import { DataVizColumnBindings } from "../../pblocks/DataVizPBlock/DataVizColumnBindings";
import { DataVizRuntimeTargets } from "../../pblocks/DataVizPBlock/DataVizRuntimeTargets";
import { makeRuntimeColumnBindingsFromDataVizProps } from "../../pblocks/DataVizPBlock/makeSavedColumnBindingsFromDataVizProps/makeRuntimeColumnBindingsFromDataVizProps";
import { transformAvaPageProps } from "../makeTraversalConfigFromAvaPageData/transformAvaPageProps";
import type {
  AvaPageData,
  AvaPageRootProps,
  PBlockPropsRegistry,
} from "../../AvaPage.types";
import type { Props as DataVizProps } from "../../pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { QueryClient } from "@tanstack/react-query";

type PrepareChartOptions = {
  props: DataVizProps & { id: string };
  auth: StructuredQueryAuth;
  queryClient: QueryClient;
  filters: readonly DashboardFilterRecord[];
};

/**
 * Binds one chart's settings and filters to its query's column IDs. A legacy
 * chart whose names do not all bind stays unchanged.
 */
async function _prepareChart({
  props,
  auth,
  queryClient,
  filters,
}: Readonly<PrepareChartOptions>): Promise<DataVizProps & { id: string }> {
  if (!props.nlQuery.rawSql.trim()) {
    return props;
  }
  const schema = await DataVizColumnBindings.get({
    options: {
      scopeKey: props.id,
      rawSql: props.nlQuery.rawSql,
      auth,
      projections: [],
      initialRegistry:
        props.columnBindingVersion === 1
          ? { ...props.columnBindings, scopeKey: props.id }
          : undefined,
    },
    queryClient: queryClient,
  });
  const scope = { id: props.id, auth, rawSql: props.nlQuery.rawSql };
  const runtimeColumnBindings = makeRuntimeColumnBindingsFromDataVizProps({
    props: props,
    schema: schema,
    filters: filters,
    cachedTargets: DataVizRuntimeTargets.get({
      queryClient: queryClient,
      scope: scope,
    }),
  });
  DataVizRuntimeTargets.set({
    queryClient: queryClient,
    scope: scope,
    targets: runtimeColumnBindings.global.targets,
  });
  return { ...props, ...runtimeColumnBindings.props };
}

/**
 * Binds every chart in the saved document to its query's column IDs at the
 * explicit dashboard save.
 */
async function _prepareDocument({
  data,
  auth,
  queryClient,
}: Readonly<{
  data: AvaPageData;
  auth: StructuredQueryAuth;
  queryClient: QueryClient;
}>): Promise<AvaPageData> {
  const charts: Array<DataVizProps & { id: string }> = [];
  const filters: DashboardFilterRecord[] = [];
  transformAvaPageProps<PBlockPropsRegistry, AvaPageRootProps>({
    data: data,
    transforms: {
      DataViz: (props) => {
        charts.push(props as DataVizProps & { id: string });
        return props;
      },
      Filter: (props) => {
        filters.push({
          filterId: props.filterId,
          columnName: props.columnName,
          label: props.label,
          operator: matchLiteral(props.mode, {
            contains: "contains",
            select_multi: "in",
            select_single: "equals",
          } as const),
          value: undefined,
        });
        return props;
      },
    },
  });
  const prepared = await Promise.all(
    charts.map((props) => {
      return _prepareChart({
        props: props,
        auth: auth,
        queryClient: queryClient,
        filters: filters,
      });
    }),
  );
  const byId = makeIdLookupMap(prepared);
  return transformAvaPageProps<PBlockPropsRegistry, AvaPageRootProps>({
    data: data,
    transforms: {
      DataViz: (props) => {
        return byId.get(props.id as string) ?? props;
      },
    },
  }) as AvaPageData;
}

/**
 * Binds every chart's settings and filters to its query's column IDs at the
 * explicit dashboard save.
 */
export const DashboardColumnBindingPreparation = {
  /** Retains unresolved authored input while preparing one chart. */
  prepareChart: _prepareChart,
  /** Prepares every chart in the saved document. */
  prepareDocument: _prepareDocument,
};
