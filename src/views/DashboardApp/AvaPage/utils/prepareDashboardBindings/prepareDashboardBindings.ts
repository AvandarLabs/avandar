import { resolveDataVizRuntimeBindings } from "../../pblocks/DataVizPBlock/resolveSavedDataVizBindings/resolveDataVizRuntimeBindings";
import { getDataVizColumnBindings } from "../../pblocks/DataVizPBlock/useDataVizColumnBindings/useDataVizColumnBindings";
import { transformAvaPageProps } from "../createAvaPageTraversalConfig/transformAvaPageProps";
import type {
  AvaPageData,
  PBlockPropsRegistry,
  AvaPageRootProps,
} from "../../AvaPage.types";
import type { Props as DataVizProps } from "../../pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Resolves one authored envelope while retaining unresolved legacy input
 * intact.
 */
export async function prepareDataVizBindings(
  props: DataVizProps & { id: string },
  auth: StructuredQueryAuth,
  queryClient: QueryClient,
  filters: readonly DashboardFilterRecord[],
): Promise<DataVizProps & { id: string }> {
  if (!props.nlQuery.rawSql.trim()) {
    return props;
  }
  const schema = await getDataVizColumnBindings(
    {
      scopeKey: props.id,
      rawSql: props.nlQuery.rawSql,
      auth,
      projections: [],
      initialRegistry:
        props.bindingVersion === 1
          ? { ...props.columnBindings, scopeKey: props.id }
          : undefined,
    },
    queryClient,
  );
  const resolved = resolveDataVizRuntimeBindings(props, schema, filters);
  return { ...props, ...resolved.props };
}

/**
 * Prepares all chart-owned identities at the explicit dashboard save
 * boundary.
 */
export async function prepareDashboardBindings(
  data: AvaPageData,
  auth: StructuredQueryAuth,
  queryClient: QueryClient,
): Promise<AvaPageData> {
  const charts: Array<DataVizProps & { id: string }> = [];
  const filters: DashboardFilterRecord[] = [];
  transformAvaPageProps<PBlockPropsRegistry, AvaPageRootProps>(data, {
    DataViz: (props) => {
      charts.push(props as DataVizProps & { id: string });
      return props;
    },
    Filter: (props) => {
      filters.push({
        filterId: props.filterId,
        columnName: props.columnName,
        label: props.label,
        operator:
          props.mode === "contains"
            ? "contains"
            : props.mode === "select_multi"
              ? "in"
              : "equals",
        value: undefined,
      });
      return props;
    },
  });
  const prepared = await Promise.all(
    charts.map((props) => {
      return prepareDataVizBindings(props, auth, queryClient, filters);
    }),
  );
  const byId = new Map(
    prepared.map((props) => {
      return [props.id, props];
    }),
  );
  return transformAvaPageProps<PBlockPropsRegistry, AvaPageRootProps>(data, {
    DataViz: (props) => {
      return byId.get(props.id as string) ?? props;
    },
  }) as AvaPageData;
}
