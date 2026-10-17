import { useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useMemo } from "react";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import { DataVizRuntimeTargets } from "../DataVizRuntimeTargets";
import { resolveDataVizRuntimeBindings } from "../resolveSavedDataVizBindings/resolveDataVizRuntimeBindings";
import { useDataVizColumnBindings } from "../useDataVizColumnBindings/useDataVizColumnBindings";
import type { Props } from "../DataVizPBlock/DataVizPBlock";
import type { DataVizRuntimeBindings } from "../resolveSavedDataVizBindings/resolveDataVizRuntimeBindings";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

type Resolution = ReturnType<typeof useDataVizColumnBindings> & {
  resolved: DataVizRuntimeBindings | undefined;
};

/** Shares unfiltered bindings without saving viewer state. */
export function useResolvedDataVizBindings(
  props: Readonly<Props & { id: string }>,
  auth: StructuredQueryAuth,
): Resolution {
  const queryClient = useQueryClient();
  const { filtersById } = DashboardFilterStateManager.useState();
  const discovery = useDataVizColumnBindings({
    scopeKey: props.id,
    rawSql: props.nlQuery.rawSql,
    initialRegistry:
      props.bindingVersion === 1
        ? { ...props.columnBindings, scopeKey: props.id }
        : undefined,
    auth,
    projections: [],
  });
  const resolved = useMemo(() => {
    if (!discovery.schema) {
      return undefined;
    }
    return resolveDataVizRuntimeBindings(
      props,
      discovery.schema,
      Object.values(filtersById),
      DataVizRuntimeTargets.get(queryClient, {
        id: props.id,
        auth,
        rawSql: props.nlQuery.rawSql,
      }),
    );
  }, [discovery.schema, props, filtersById, queryClient, auth]);
  useLayoutEffect(
    function rememberRuntimeTargets() {
      if (resolved) {
        DataVizRuntimeTargets.set(
          queryClient,
          {
            id: props.id,
            auth,
            rawSql: props.nlQuery.rawSql,
          },
          resolved.global.targets,
        );
      }
    },
    [queryClient, props.id, auth, props.nlQuery.rawSql, resolved],
  );
  return { ...discovery, resolved };
}
