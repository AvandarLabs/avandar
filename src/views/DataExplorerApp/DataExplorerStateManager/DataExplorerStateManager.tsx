import { Model } from "@avandar/models";
import { setValue } from "@avandar/utils";
import { normalizeSqlForSubquery } from "@avandar/utils/sql";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";
import { INITIAL_DATA_EXPLORER_STATE } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import {
  applyQueryChange,
  isSameColumnSchema,
  makePluginVizConfigMemoryFromBindings,
  makeStateFromPluginVizConfig,
  makeVizConfigMemoriesFromState,
} from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers";
import { DataExplorerSourceActions } from "./DataExplorerSourceActions";
import type { UserQueryAnalyticsTrigger } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { QueryResultColumnBindingRegistry } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { SqlFailedMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlFailedMappingReason.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type {
  DataExplorerAppState,
  DerivedColumnsSnapshot,
  OpenDatasetInfo,
} from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";

// Re-exported INITIAL_DATA_EXPLORER_STATE lives in
// DataExplorerAppState.types.ts so other consumers can import it without
// pulling in the full state manager.
const initialDataExplorerState: DataExplorerAppState =
  INITIAL_DATA_EXPLORER_STATE;

/**
 * This store is used to manage the state of the Data Explorer app.
 *
 * This store is used at the WorkspaceLayout level therefore it is reachable
 * from any app view in the workspace.
 */
export const DataExplorerStateManager = createAppStateManager({
  name: "DataExplorer",
  initialState: initialDataExplorerState,
  actions: {
    ...DataExplorerSourceActions,

    /** Set the aggregation for a specific column */
    setColumnAggregation: (
      state: DataExplorerAppState,
      payload: {
        columnId: QueryColumn.Id;
        aggregation: QueryAggregationType.T;
      },
    ) => {
      const { query, vizConfig } = state;
      const { queryColumns, aggregations } = query;
      const { columnId, aggregation } = payload;
      const newQueryColumns = queryColumns.map((col) => {
        if (col.id === columnId && col.aggregation !== aggregation) {
          return { ...col, aggregation };
        }
        return col;
      });
      const newAggregations = {
        ...aggregations,
        [columnId]: aggregation,
      };
      const newQuery = {
        ...query,
        queryColumns: newQueryColumns,
        aggregations: newAggregations,
      } as StructuredQuery.Partial;
      const newVizConfig = AvaVizConfigs.hydrateFromQuery(vizConfig, newQuery);
      const next = applyQueryChange({ state, newQuery });
      return { ...next, vizConfig: newVizConfig };
    },

    /** Set the column that we are ordering by. */
    setOrderByColumn: (
      state: DataExplorerAppState,
      columnId: QueryColumn.Id | undefined,
    ) => {
      const newQuery = {
        ...state.query,
        orderByColumn: columnId,
      } as StructuredQuery.Partial;
      return applyQueryChange({ state, newQuery });
    },

    /** Set the direction that we are ordering by. */
    setOrderByDirection: (
      state: DataExplorerAppState,
      direction: StructuredQuery.OrderByDirection | undefined,
    ) => {
      const newQuery = {
        ...state.query,
        orderByDirection: direction,
      } as StructuredQuery.Partial;
      return applyQueryChange({ state, newQuery });
    },

    /** Set the LIMIT clause for the query. */
    setLimit: (state: DataExplorerAppState, limit: number | undefined) => {
      const newQuery = {
        ...state.query,
        limit,
      } as StructuredQuery.Partial;
      return applyQueryChange({ state, newQuery });
    },

    /**
     * Set the recursive filter tree on the structured query, which also
     * regenerates the raw SQL via knex.
     */
    setFilters: (
      state: DataExplorerAppState,
      filters: StructuredQuery.FilterGroup,
    ) => {
      const newQuery = {
        ...state.query,
        filters,
      } as StructuredQuery.Partial;
      return applyQueryChange({ state, newQuery });
    },

    /**
     * Apply the output of `sqlToStructuredQuery` to state: replace the
     * structured form with the parsed query, leave the raw SQL untouched,
     * and record whether the mapping was lossy.
     */
    applySqlMapping: (
      state: DataExplorerAppState,
      payload: {
        query: StructuredQuery.Partial;
        isFullyMapped: boolean;
        unmappedReasons: readonly SqlFailedMappingReason[];
      },
    ): DataExplorerAppState => {
      return {
        ...state,
        query: payload.query,
        sourceCatalog: payload.query.sourceColumns
          ? {
              sourceKey: payload.query.dataSource
                ? Model.getTypedId(payload.query.dataSource)
                : undefined,
              status: "ready",
              columns: payload.query.sourceColumns,
            }
          : state.sourceCatalog,
        isStructuredQueryInSync: payload.isFullyMapped,
        sqlSyncWarnings: payload.unmappedReasons,
      };
    },

    /** Reset the filter tree to the empty group. */
    clearFilters: (state: DataExplorerAppState): DataExplorerAppState => {
      const newQuery = {
        ...state.query,
        filters: StructuredQuery.EMPTY_FILTER,
      } as StructuredQuery.Partial;
      return applyQueryChange({ state, newQuery });
    },

    /**
     * Activates a visualization type while preserving its most recent config.
     * A built-in type restores its remembered config or converts the active
     * one, then fills empty slots. A plugin chart config, built by the viz
     * type picker, gives way to the config remembered for its plugin chart
     * type when there is one.
     */
    setActiveVizType: (
      state: DataExplorerAppState,
      target: AvaVizConfig.Type | AvaVizConfig.Plugin,
    ): DataExplorerAppState => {
      if (typeof target !== "string") {
        return makeStateFromPluginVizConfig({ state, pluginVizConfig: target });
      }
      const { vizConfig, query, vizConfigMemory, lastResultColumns } = state;

      // A bare "plugin" type names no plugin chart type, so there is nothing
      // to activate.
      if (vizConfig.vizType === target || target === "plugin") {
        return state;
      }

      const rememberedVizConfig = vizConfigMemory[target];
      const initialVizConfig =
        rememberedVizConfig ??
        AvaVizConfigs.convertVizConfig(vizConfig, target);
      const nextVizConfig =
        lastResultColumns !== undefined
          ? AvaVizConfigs.hydrateFromQueryResult(
              initialVizConfig,
              lastResultColumns,
            )
          : rememberedVizConfig === undefined && state.isStructuredQueryInSync
            ? AvaVizConfigs.hydrateFromQuery(initialVizConfig, query)
            : initialVizConfig;

      return {
        ...state,
        ...makeVizConfigMemoriesFromState(state),
        vizConfig: nextVizConfig,
        pendingUrlVizConfig: undefined,
      };
    },

    /**
     * Holds a chart config restored from the URL until a query result can bind
     * its `QueryResult` column names to column IDs. Shows an empty chart of the
     * restored type meanwhile.
     */
    restoreVizConfigFromUrl: (
      state: DataExplorerAppState,
      urlVizConfig: UiVizConfig,
    ): DataExplorerAppState => {
      return {
        ...state,
        vizConfig:
          urlVizConfig.vizType === "plugin"
            ? { ...urlVizConfig, columnSettings: {} }
            : AvaVizConfigs.makeEmptyConfig(urlVizConfig.vizType),
        pendingUrlVizConfig: urlVizConfig,
      };
    },

    /**
     * Seeds unconfigured slots from the result's columns and preserves owned
     * selections while their `QueryResult` column is unavailable. A chart
     * config restored from the URL is first bound to these columns by
     * `QueryResult` column name.
     */
    syncVizFromQueryResult: (
      state: DataExplorerAppState,
      columns: readonly QueryResult.ColumnWithId[],
    ) => {
      const { pendingUrlVizConfig } = state;
      const next = AvaVizConfigs.hydrateFromQueryResult(
        pendingUrlVizConfig
          ? AvaVizConfigs.makeFromUiVizConfig({
              config: pendingUrlVizConfig,
              columns: columns,
            }).config
          : state.vizConfig,
        columns,
      );

      const columnsChanged = !isSameColumnSchema({
        previousColumns: state.lastResultColumns,
        currentColumns: columns,
      });
      const vizConfigChanged = !AvaVizConfigs.isEqual(next, state.vizConfig);

      if (!columnsChanged && !vizConfigChanged && !pendingUrlVizConfig) {
        return state;
      }

      return {
        ...state,
        ...(vizConfigChanged ? { vizConfig: next } : {}),
        ...(columnsChanged ? { lastResultColumns: columns } : {}),
        pendingUrlVizConfig: undefined,
      };
    },

    /**
     * Stores the column bindings of the latest bound query result, which the
     * next result is bound from and "Save to dashboard" saves with the chart.
     * Chart configs on provisional SQL column IDs, remembered ones included,
     * move to the IDs these bindings give the same expressions.
     */
    setColumnBindings: (
      state: DataExplorerAppState,
      columnBindings: QueryResultColumnBindingRegistry,
    ) => {
      const previous = state.columnBindings;
      if (!previous) {
        return { ...state, columnBindings };
      }
      const vizConfig = AvaVizConfigs.remapProvisionalColumnIds({
        config: state.vizConfig,
        previous: previous,
        current: columnBindings,
      });
      const vizConfigMemory = Object.fromEntries(
        Object.entries(state.vizConfigMemory).map(([type, config]) => {
          return [
            type,
            AvaVizConfigs.remapProvisionalColumnIds({
              config: config,
              previous: previous,
              current: columnBindings,
            }),
          ];
        }),
      ) as Partial<AvaVizConfig.Registry>;
      const pluginVizConfigMemory = makePluginVizConfigMemoryFromBindings({
        memory: state.pluginVizConfigMemory,
        previous: previous,
        current: columnBindings,
      });
      return {
        ...state,
        columnBindings,
        vizConfig,
        vizConfigMemory,
        pluginVizConfigMemory,
      };
    },

    /** Applies an explicit chart edit, replacing any URL-restored chart. */
    setVizConfig: (state: DataExplorerAppState, vizConfig: AvaVizConfig.T) => {
      // fill in the defaults
      return {
        ...setValue(state, "vizConfig", vizConfig),
        pendingUrlVizConfig: undefined,
      };
    },

    setRawSql: (state: DataExplorerAppState, rawSql: string | undefined) => {
      // When SQL is cleared we are trivially back in sync (both empty).
      if (rawSql === undefined || rawSql === "") {
        return {
          ...state,
          rawSql: undefined,
          isStructuredQueryInSync: true,
          sqlSyncWarnings: [],
        };
      }
      // Setting raw SQL via this action does not run the parser; the parser
      // is wired up in the SQL view because it needs dataset metadata. Mark
      // the form as potentially out of sync so the UI can surface that.
      return {
        ...state,
        rawSql: rawSql,
        lastResultColumns: undefined,
        isStructuredQueryInSync: false,
        sqlSyncWarnings: state.sqlSyncWarnings,
      };
    },

    /**
     * Runs the SQL a plugin command built to add derived columns to the
     * current result. Keeps the chart, and moves the column bindings to the
     * new SQL so the columns it passes through keep their IDs. Does not parse
     * the SQL, so the structured query stays as it was, out of sync.
     */
    applyDerivedColumnsSql: (
      state: DataExplorerAppState,
      sql: string,
    ): DataExplorerAppState => {
      const { columnBindings } = state;
      return {
        ...state,
        rawSql: sql,
        queryTrigger: "plugin_command",
        isStructuredQueryInSync: false,
        lastResultColumns: undefined,
        pendingUrlVizConfig: undefined,
        nlPrompt: undefined,
        columnBindings: columnBindings
          ? { ...columnBindings, sqlKey: normalizeSqlForSubquery(sql) }
          : undefined,
      };
    },

    /**
     * Puts back what `applyDerivedColumnsSql` replaced, from a snapshot taken
     * before it ran, and runs that query again. Used by the Undo action of the
     * derived columns notification.
     */
    restoreDerivedColumnsSnapshot: (
      state: DataExplorerAppState,
      snapshot: DerivedColumnsSnapshot,
    ): DataExplorerAppState => {
      return {
        ...state,
        ...snapshot,
        queryTrigger: "plugin_command",
        lastResultColumns: undefined,
        pendingUrlVizConfig: undefined,
      };
    },

    /**
     * Mark the sync flag without changing any other state. Used by
     * components that have just refreshed the structured form from SQL.
     */
    setSqlSyncState: (
      state: DataExplorerAppState,
      payload: {
        isStructuredQueryInSync: boolean;
        sqlSyncWarnings: readonly SqlFailedMappingReason[];
      },
    ): DataExplorerAppState => {
      return {
        ...state,
        isStructuredQueryInSync: payload.isStructuredQueryInSync,
        sqlSyncWarnings: payload.sqlSyncWarnings,
      };
    },

    /**
     * Record the natural-language prompt that produced the current `rawSql`.
     * Used by the "Save to dashboard" flow to seed the DataViz block's
     * `nlQuery.prompt` so the saved block renders identically to one created
     * inside the dashboard editor.
     */
    setNlPrompt: (
      state: DataExplorerAppState,
      nlPrompt: string | undefined,
    ) => {
      return setValue(state, "nlPrompt", nlPrompt);
    },

    /**
     * Set (or clear) the currently open saved dataset. Pass `undefined` to
     * indicate no dataset is open.
     */
    setOpenDataset: (
      state: DataExplorerAppState,
      openDataset: OpenDatasetInfo | undefined,
    ): DataExplorerAppState => {
      return { ...state, openDataset };
    },

    /**
     * Record the runtime error message from the most recent query attempt, or
     * clear it by passing `undefined`. The chat panel reads this so it can
     * surface a one-click "Regenerate with the error" action when the
     * auto-applied SQL fails at runtime.
     */
    setLastQueryError: (
      state: DataExplorerAppState,
      lastQueryError: string | undefined,
    ): DataExplorerAppState => {
      return { ...state, lastQueryError };
    },

    /**
     * Record what caused the next query run.
     *
     * The trigger is not part of the query key, so what matters is only that
     * it holds its final value by the end of the synchronous block that
     * changes the query: React coalesces those dispatches into one render, so
     * no intermediate value is ever observed. Origins that only touch
     * `rawSql` stamp immediately before their change. URL hydration stamps
     * last instead, after the manual-form actions it dispatches, because
     * those would otherwise overwrite it.
     */
    setQueryTrigger: (
      state: DataExplorerAppState,
      queryTrigger: UserQueryAnalyticsTrigger,
    ): DataExplorerAppState => {
      return { ...state, queryTrigger };
    },

    /** Reset the Data Explorer to its initial (blank) state. */
    resetState: (): DataExplorerAppState => {
      return initialDataExplorerState;
    },
  },
});
