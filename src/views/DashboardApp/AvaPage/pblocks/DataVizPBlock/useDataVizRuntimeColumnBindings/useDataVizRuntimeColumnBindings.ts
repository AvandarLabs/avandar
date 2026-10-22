import { useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useMemo } from "react";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import { DataVizRuntimeTargets } from "../DataVizRuntimeTargets";
import { makeRuntimeColumnBindingsFromDataVizProps } from "../makeSavedColumnBindingsFromDataVizProps/makeRuntimeColumnBindingsFromDataVizProps";
import { useDataVizColumnBindings } from "../useDataVizColumnBindings/useDataVizColumnBindings";
import type { Props } from "../DataVizPBlock/DataVizPBlock";
import type { DataVizRuntimeColumnBindings } from "../makeSavedColumnBindingsFromDataVizProps/makeRuntimeColumnBindingsFromDataVizProps";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

type RuntimeColumnBindingsState = ReturnType<
  typeof useDataVizColumnBindings
> & {
  runtime: DataVizRuntimeColumnBindings | undefined;
};

/**
 * Discovers a chart query's unfiltered output columns, then binds the chart's
 * settings and filters to their column IDs without saving viewer state.
 */
export function useDataVizRuntimeColumnBindings({
  props,
  auth,
}: Readonly<{
  props: Readonly<Props & { id: string }>;
  auth: StructuredQueryAuth;
}>): RuntimeColumnBindingsState {
  const queryClient = useQueryClient();
  const { filtersById } = DashboardFilterStateManager.useState();
  const discovery = useDataVizColumnBindings({
    scopeKey: props.id,
    rawSql: props.nlQuery.rawSql,
    initialRegistry:
      props.columnBindingVersion === 1
        ? { ...props.columnBindings, scopeKey: props.id }
        : undefined,
    auth,
    projections: [],
  });
  const runtime = useMemo(() => {
    if (!discovery.schema) {
      return undefined;
    }
    return makeRuntimeColumnBindingsFromDataVizProps({
      props: props,
      schema: discovery.schema,
      filters: Object.values(filtersById),
      cachedTargets: DataVizRuntimeTargets.get({
        queryClient: queryClient,
        scope: {
          id: props.id,
          auth,
          rawSql: props.nlQuery.rawSql,
        },
      }),
    });
  }, [discovery.schema, props, filtersById, queryClient, auth]);
  useLayoutEffect(
    function rememberRuntimeTargets() {
      if (runtime) {
        DataVizRuntimeTargets.set({
          queryClient: queryClient,
          scope: {
            id: props.id,
            auth,
            rawSql: props.nlQuery.rawSql,
          },
          targets: runtime.global.targets,
        });
      }
    },
    [queryClient, props.id, auth, props.nlQuery.rawSql, runtime],
  );
  return { ...discovery, runtime };
}
