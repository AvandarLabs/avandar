import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { applyVizConfigFromQueryResult } from "$/models/vizs/applyVizConfigFromQueryResult/applyVizConfigFromQueryResult";
import { resolveDashboardFilterBindings } from "@/views/DashboardApp/DashboardFilterStateManager/resolveDashboardFilterBindings/resolveDashboardFilterBindings";
import { DataVizFilters } from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import { resolveSavedDataVizBindings } from "./resolveSavedDataVizBindings";
import type { BoundResultSchema } from "$/models/queries/QueryColumnBindings/QueryColumnBindings";
import type { LocalFilter } from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import type { Props } from "../DataVizPBlock/DataVizPBlock";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { DashboardFilterTargets } from "@/views/DashboardApp/DashboardFilterStateManager/resolveDashboardFilterBindings/resolveDashboardFilterBindings";

/** Complete in-memory render resolution, independent of persistence. */
export type DataVizRuntimeBindings = ReturnType<
  typeof resolveSavedDataVizBindings
> & {
  global: ReturnType<typeof resolveDashboardFilterBindings>;
  localFilters: readonly LocalFilter[];
};

function _getTargets(
  props: Props,
  schema: BoundResultSchema,
  cached: DashboardFilterTargets | undefined,
): DashboardFilterTargets {
  const targets =
    cached ?? (props.bindingVersion === 1 ? props.globalFilterTargets : {});
  if (
    cached ||
    props.bindingVersion === 0 ||
    props.columnBindings.sqlKey === schema.registry.sqlKey
  ) {
    return targets;
  }
  return Object.fromEntries(
    Object.entries(targets).map(([id, target]) => {
      return [
        id,
        target.kind === "unresolved"
          ? { kind: "legacy" as const, columnName: target.columnName }
          : target,
      ];
    }),
  );
}

/** Resolves chart and filter targets for rendering and explicit save. */
export function resolveDataVizRuntimeBindings(
  props: Props,
  schema: BoundResultSchema,
  filters: readonly DashboardFilterRecord[],
  cachedTargets?: DashboardFilterTargets,
): DataVizRuntimeBindings {
  const result = resolveSavedDataVizBindings(props, schema);
  const global = resolveDashboardFilterBindings({
    filters,
    targets: _getTargets(props, schema, cachedTargets),
    columns: schema.columns,
    subscribedFilterIds: DataVizFilters.resolveSubscribedFilterIds({
      subscription: props.globalFilterSubscription,
      registeredFilters: filters,
    }),
  });
  const runtimeConfig =
    props.bindingVersion === 0 && result.issues.length
      ? result.runtimeConfig
      : applyVizConfigFromQueryResult({
          vizConfig: result.runtimeConfig,
          columns: schema.columns,
          rawSql: props.nlQuery.rawSql,
          query: StructuredQuery.makeEmpty(),
        });
  const canBind =
    result.props.bindingVersion === 1 &&
    (props.bindingVersion === 1 || global.issues.length === 0);
  const boundProps =
    canBind && result.props.bindingVersion === 1
      ? {
          ...result.props,
          vizConfig: runtimeConfig,
          globalFilterTargets: global.targets,
        }
      : props;
  return {
    ...result,
    runtimeConfig,
    global,
    localFilters:
      result.props.bindingVersion === 1 ? result.props.localFilters : [],
    props: boundProps,
  };
}
