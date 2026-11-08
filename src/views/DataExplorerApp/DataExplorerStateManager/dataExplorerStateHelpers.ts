import { objectValuesMap } from "@avandar/utils";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { makePluginVizMemoryKey } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { QueryResultColumnBindingRegistry } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { DataExplorerAppState } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";

/**
 * Try to compute a fresh SQL string from the structured query. Used by
 * manual-form actions to keep `rawSql` in sync. Returns undefined when the
 * query has no data source.
 */
function _regenerateRawSqlFromQuery(
  query: StructuredQuery.Partial,
): string | undefined {
  if (query.dataSource === undefined) {
    return undefined;
  }
  try {
    const sql = structuredQueryToSql(query);
    return sql || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Apply a structured-query change and also refresh `rawSql` to match,
 * marking SQL to form sync as `true`. Used by manual-form actions that
 * the user makes after opening the panel.
 *
 * Stamps `structured_change` as the origin, overwriting whatever was there.
 * That is correct for the manual-form actions this serves, whose stamp is
 * always the freshest one by the time the query runs. Two callers reach it
 * without a user editing the form: URL hydration re-stamps `url_hydration`
 * after its own dispatches in the same render, and the large-dataset
 * auto-limit in `useSyncLargeDatasetAutoLimit` deliberately reads as a
 * structured change, since the trigger union has no member for a limit the
 * system applied on the user's behalf.
 */
export function applyQueryChange(
  options: Readonly<{
    state: DataExplorerAppState;
    newQuery: StructuredQuery.Partial;
  }>,
): DataExplorerAppState {
  const { state, newQuery } = options;
  const newSql = _regenerateRawSqlFromQuery(newQuery);
  return {
    ...state,
    query: newQuery,
    rawSql: newSql,
    isStructuredQueryInSync: true,
    sqlSyncWarnings: [],
    queryTrigger: "structured_change",
  };
}

/**
 * Returns true when two column lists describe the same result schema:
 * same length, IDs, names, and data types, in order. Used by
 * `syncVizFromQueryResult` to avoid re-emitting state on identical refetches.
 */
export function isSameColumnSchema(
  options: Readonly<{
    previousColumns: readonly QueryResult.ColumnWithId[] | undefined;
    currentColumns: readonly QueryResult.ColumnWithId[];
  }>,
): boolean {
  const { previousColumns, currentColumns } = options;
  if (previousColumns === undefined) {
    return currentColumns.length === 0;
  }
  if (previousColumns.length !== currentColumns.length) {
    return false;
  }
  return currentColumns.every((currentColumn, idx) => {
    const previousColumn = previousColumns[idx];
    return (
      previousColumn?.id === currentColumn.id &&
      previousColumn?.name === currentColumn.name &&
      previousColumn?.dataType === currentColumn.dataType
    );
  });
}

/**
 * Returns the state's two viz config memories with its active config filed
 * under its own key: a built-in config under its viz type in
 * `vizConfigMemory`, a plugin config under its plugin memory key in
 * `pluginVizConfigMemory`. Called by `setActiveVizType` and
 * `makeStateFromPluginVizConfig` on the way out of the active chart type, so
 * switching back restores that config.
 */
export function makeVizConfigMemoriesFromState(
  state: Readonly<DataExplorerAppState>,
): Pick<DataExplorerAppState, "vizConfigMemory" | "pluginVizConfigMemory"> {
  const { vizConfig, vizConfigMemory, pluginVizConfigMemory } = state;
  if (vizConfig.vizType === "plugin") {
    return {
      vizConfigMemory,
      pluginVizConfigMemory: {
        ...pluginVizConfigMemory,
        [makePluginVizMemoryKey(vizConfig)]: vizConfig,
      },
    };
  }
  // TypeScript widens the computed union key to `string` and so cannot see
  // that `vizConfig` lands under its own `vizType`. The key is taken from
  // the value itself, so the correlation holds by construction.
  return {
    vizConfigMemory: {
      ...vizConfigMemory,
      [vizConfig.vizType]: vizConfig,
    } as Partial<AvaVizConfig.Registry>,
    pluginVizConfigMemory,
  };
}

/**
 * Activates a plugin chart config picked in the viz type picker, or the
 * config remembered for the same plugin chart type when there is one, and
 * files the outgoing config. Returns `state` unchanged when that plugin chart
 * type is already active. Called by `setActiveVizType` for a plugin target.
 */
export function makeStateFromPluginVizConfig(
  options: Readonly<{
    state: DataExplorerAppState;
    pluginVizConfig: AvaVizConfig.Plugin;
  }>,
): DataExplorerAppState {
  const { state, pluginVizConfig } = options;
  const memoryKey = makePluginVizMemoryKey(pluginVizConfig);
  if (
    state.vizConfig.vizType === "plugin" &&
    makePluginVizMemoryKey(state.vizConfig) === memoryKey
  ) {
    return state;
  }
  return {
    ...state,
    ...makeVizConfigMemoriesFromState(state),
    vizConfig: state.pluginVizConfigMemory[memoryKey] ?? pluginVizConfig,
    pendingUrlVizConfig: undefined,
  };
}

/**
 * Returns the plugin chart config memory with each remembered config moved
 * from the provisional column IDs of `previous` to the IDs `current` gives the
 * same expressions. Called by `setColumnBindings`, which remaps the built-in
 * memory the same way.
 */
export function makePluginVizConfigMemoryFromBindings(
  options: Readonly<{
    memory: Readonly<Record<string, AvaVizConfig.Plugin>>;
    previous: QueryResultColumnBindingRegistry;
    current: QueryResultColumnBindingRegistry;
  }>,
): Readonly<Record<string, AvaVizConfig.Plugin>> {
  const { memory, previous, current } = options;
  return objectValuesMap(memory, (config) => {
    const remappedConfig = AvaVizConfigs.remapProvisionalColumnIds({
      config: config,
      previous: previous,
      current: current,
    });
    // The remap keeps a config's viz type, so this only narrows the result
    // back to a plugin config.
    return remappedConfig.vizType === "plugin" ? remappedConfig : config;
  });
}
