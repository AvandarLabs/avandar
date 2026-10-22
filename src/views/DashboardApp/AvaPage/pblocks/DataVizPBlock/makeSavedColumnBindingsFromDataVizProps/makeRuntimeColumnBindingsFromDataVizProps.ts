import { objectValuesMap } from "@avandar/utils";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { applyVizConfigFromQueryResult } from "$/models/vizs/applyVizConfigFromQueryResult/applyVizConfigFromQueryResult";
import { makeColumnBindingsFromDashboardFilters } from "@/views/DashboardApp/DashboardFilterStateManager/makeColumnBindingsFromDashboardFilters/makeColumnBindingsFromDashboardFilters";
import { DataVizFilters } from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import { makeSavedColumnBindingsFromDataVizProps } from "./makeSavedColumnBindingsFromDataVizProps";
import type { ResultColumnBindings } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types";
import type { LocalFilter } from "../DataVizPBlock/DataVizFilters/DataVizFilters";
import type { Props } from "../DataVizPBlock/DataVizPBlock";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { DashboardFilterTargets } from "@/views/DashboardApp/DashboardFilterStateManager/makeColumnBindingsFromDashboardFilters/makeColumnBindingsFromDashboardFilters";
type Options = {
  props: Props;
  schema: ResultColumnBindings;
  filters: readonly DashboardFilterRecord[];
  cachedTargets?: DashboardFilterTargets;
};

/**
 * A chart's settings, local filters, and subscribed dashboard filters bound to
 * its query's column IDs, held in memory and never persisted on its own.
 */
export type DataVizRuntimeColumnBindings = ReturnType<
  typeof makeSavedColumnBindingsFromDataVizProps
> & {
  global: ReturnType<typeof makeColumnBindingsFromDashboardFilters>;
  localFilters: readonly LocalFilter[];
};

function _getTargets({
  props,
  schema,
  cached,
}: {
  props: Props;
  schema: ResultColumnBindings;
  cached: DashboardFilterTargets | undefined;
}): DashboardFilterTargets {
  const targets =
    cached ??
    (props.columnBindingVersion === 1 ? props.globalFilterTargets : {});
  if (
    cached ||
    props.columnBindingVersion === 0 ||
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

/**
 * Binds a chart's settings, local filters, and subscribed dashboard filters to
 * the column IDs of its query's current output, for rendering and for an
 * explicit save.
 */
export function makeRuntimeColumnBindingsFromDataVizProps({
  props,
  schema,
  filters,
  cachedTargets,
}: Readonly<Options>): DataVizRuntimeColumnBindings {
  const result = makeSavedColumnBindingsFromDataVizProps({
    props: props,
    schema: schema,
  });
  const global = makeColumnBindingsFromDashboardFilters({
    filters,
    targets: _getTargets({
      props: props,
      schema: schema,
      cached: cachedTargets,
    }),
    columns: schema.columns,
    subscribedFilterIds: DataVizFilters.getSubscribedFilterIdsFromSubscription({
      subscription: props.globalFilterSubscription,
      registeredFilters: filters,
    }),
  });
  const runtimeConfig =
    props.columnBindingVersion === 0 && result.issues.length
      ? result.runtimeConfig
      : applyVizConfigFromQueryResult({
          vizConfig: result.runtimeConfig,
          columns: schema.columns,
          rawSql: props.nlQuery.rawSql,
          query: StructuredQuery.makeEmpty(),
        });
  const canPersistColumnIds =
    result.props.columnBindingVersion === 1 &&
    (props.columnBindingVersion === 1 || global.issues.length === 0);
  const runtimeProps =
    canPersistColumnIds && result.props.columnBindingVersion === 1
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
    props: runtimeProps,
  };
}
