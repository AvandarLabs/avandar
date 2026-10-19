import { objectValuesMap } from "@avandar/utils";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { applyVizConfigFromQueryResult } from "$/models/vizs/applyVizConfigFromQueryResult/applyVizConfigFromQueryResult";
import { makeBindingsFromDashboardFilters } from "@/views/DashboardApp/DashboardFilterStateManager/makeBindingsFromDashboardFilters/makeBindingsFromDashboardFilters";
import { DataVizFilters } from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import { makeSavedBindingsFromDataVizProps } from "./makeSavedBindingsFromDataVizProps";
import type { BoundResultSchema } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types";
import type { LocalFilter } from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import type { Props } from "../DataVizPBlock/DataVizPBlock";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { DashboardFilterTargets } from "@/views/DashboardApp/DashboardFilterStateManager/makeBindingsFromDashboardFilters/makeBindingsFromDashboardFilters";
type Options = {
  props: Props;
  schema: BoundResultSchema;
  filters: readonly DashboardFilterRecord[];
  cachedTargets?: DashboardFilterTargets;
};

/** Complete in-memory render resolution, independent of persistence. */
export type DataVizRuntimeBindings = ReturnType<
  typeof makeSavedBindingsFromDataVizProps
> & {
  global: ReturnType<typeof makeBindingsFromDashboardFilters>;
  localFilters: readonly LocalFilter[];
};

function _getTargets({
  props,
  schema,
  cached,
}: {
  props: Props;
  schema: BoundResultSchema;
  cached: DashboardFilterTargets | undefined;
}): DashboardFilterTargets {
  const targets =
    cached ?? (props.bindingVersion === 1 ? props.globalFilterTargets : {});
  if (
    cached ||
    props.bindingVersion === 0 ||
    props.columnBindings.sqlKey === schema.registry.sqlKey
  ) {
    return targets;
  }
  return objectValuesMap(targets, (target) => {
    return target.kind === "unresolved"
      ? { kind: "legacy" as const, columnName: target.columnName }
      : target;
  });
}

/** Resolves chart and filter targets for rendering and explicit save. */
export function makeRuntimeBindingsFromDataVizProps({
  props,
  schema,
  filters,
  cachedTargets,
}: Readonly<Options>): DataVizRuntimeBindings {
  const result = makeSavedBindingsFromDataVizProps({
    props: props,
    schema: schema,
  });
  const global = makeBindingsFromDashboardFilters({
    filters,
    targets: _getTargets({
      props: props,
      schema: schema,
      cached: cachedTargets,
    }),
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
    props: boundProps,
  };
}
