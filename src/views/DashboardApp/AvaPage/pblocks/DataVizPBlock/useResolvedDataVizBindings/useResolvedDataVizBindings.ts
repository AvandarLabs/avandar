import { useLayoutEffect, useMemo, useRef } from "react";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import { resolveDataVizRuntimeBindings } from "../resolveSavedDataVizBindings/resolveDataVizRuntimeBindings";
import { useDataVizColumnBindings } from "../useDataVizColumnBindings/useDataVizColumnBindings";
import type { Props } from "../DataVizPBlock/DataVizPBlock";
import type { DataVizRuntimeBindings } from "../resolveSavedDataVizBindings/resolveDataVizRuntimeBindings";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { DashboardFilterTargets } from "@/views/DashboardApp/DashboardFilterStateManager/resolveDashboardFilterBindings/resolveDashboardFilterBindings";

type Resolution = ReturnType<typeof useDataVizColumnBindings> & {
  resolved: DataVizRuntimeBindings | undefined;
};

/** Shares unfiltered bindings without saving viewer state. */
export function useResolvedDataVizBindings(
  props: Readonly<Props & { id: string }>,
  auth: StructuredQueryAuth,
): Resolution {
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
  const previous = useRef<
    { sql: string; targets: DashboardFilterTargets } | undefined
  >(undefined);
  const resolved = useMemo(() => {
    if (!discovery.schema) {
      return undefined;
    }
    const cachedTargets =
      previous.current?.sql === props.nlQuery.rawSql
        ? previous.current.targets
        : undefined;
    return resolveDataVizRuntimeBindings(
      props,
      discovery.schema,
      Object.values(filtersById),
      cachedTargets,
    );
  }, [discovery.schema, props, filtersById]);
  useLayoutEffect(
    function rememberRuntimeTargets() {
      if (resolved) {
        previous.current = {
          sql: props.nlQuery.rawSql,
          targets: resolved.global.targets,
        };
      }
    },
    [props.nlQuery.rawSql, resolved],
  );
  return { ...discovery, resolved };
}
