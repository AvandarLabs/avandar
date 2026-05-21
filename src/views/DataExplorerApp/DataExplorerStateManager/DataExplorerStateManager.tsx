import { makeObject, prop, setValue } from "@utils";
import { QueryColumnId } from "$/models/queries/QueryColumn/QueryColumn.types";
import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types";
import { structuredQueryToSQL } from "$/models/queries/StructuredQuery/structuredQueryToSQL";
import {
  applyVizConfigFromQueryResult,
  isVizConfigEqualForQueryResultSync,
} from "$/models/vizs/applyVizConfigFromQueryResult";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";
import { INITIAL_DATA_EXPLORER_STATE } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerAppState";
import { applyDefaultManualQueryLimit } from "@/views/DataExplorerApp/manualQueryLimit";
import type {
  DataExplorerAppState,
  OpenDatasetInfo,
} from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerAppState";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";
import type {
  OrderByDirection,
  PartialStructuredQuery,
} from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type {
  VizConfig,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types";

/**
 * Try to compute a fresh SQL string from the structured query. Used by
 * manual-form actions to keep `rawSQL` in sync. Returns undefined when the
 * query has no data source.
 */
function _regenerateRawSqlFromQuery(
  query: PartialStructuredQuery,
): string | undefined {
  if (query.dataSource === undefined) {
    return undefined;
  }
  try {
    const sql = structuredQueryToSQL(query);
    return sql || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Apply a structured-query change and also refresh `rawSQL` to match,
 * marking SQL ↔ form sync as `true`. Used by manual-form actions that
 * the user makes after opening the panel.
 */
function _applyQueryChange(
  state: DataExplorerAppState,
  newQuery: PartialStructuredQuery,
): DataExplorerAppState {
  const newSql = _regenerateRawSqlFromQuery(newQuery);
  return {
    ...state,
    query: newQuery,
    rawSQL: newSql,
    isStructuredQueryInSync: true,
    sqlSyncWarnings: [],
  };
}

/**
 * This store is used to manage the state of the Data Explorer app.
 *
 * This store is used at the WorkspaceLayout level therefore it is reachable
 * from any app view in the workspace.
 */
export const DataExplorerStateManager = createAppStateManager({
  name: "DataExplorer",
  initialState: INITIAL_DATA_EXPLORER_STATE,
  actions: {
    /** Set the data source for the query. */
    setDataSource: (
      state: DataExplorerAppState,
      dataSource: QueryDataSource | undefined,
      options?: { limit?: number },
    ) => {
      const newQuery = applyDefaultManualQueryLimit({
        ...state.query,
        dataSource,
        ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      } as PartialStructuredQuery);
      return _applyQueryChange(state, newQuery);
    },

    /** Set the columns for the query. */
    setColumns: (
      state: DataExplorerAppState,
      columns: readonly QueryColumn.T[],
    ) => {
      const {
        query: { aggregations },
      } = state;
      const newColumnIds = columns.map(prop("id"));
      const newAggregations = makeObject(newColumnIds, {
        valueFn: (colId) => {
          // if this column already had an aggregation we keep it
          return aggregations[colId] ?? "none";
        },
      });
      const newQuery = {
        ...state.query,
        queryColumns: columns,
        aggregations: newAggregations,
      } as PartialStructuredQuery;
      const newVizConfig = VizConfigs.hydrateFromQuery(
        state.vizConfig,
        newQuery,
      );
      const next = _applyQueryChange(state, newQuery);
      return { ...next, vizConfig: newVizConfig };
    },

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
      } as PartialStructuredQuery;
      const newVizConfig = VizConfigs.hydrateFromQuery(vizConfig, newQuery);
      const next = _applyQueryChange(state, newQuery);
      return { ...next, vizConfig: newVizConfig };
    },

    /** Set the column that we are ordering by. */
    setOrderByColumn: (
      state: DataExplorerAppState,
      columnId: QueryColumnId | undefined,
    ) => {
      const newQuery = {
        ...state.query,
        orderByColumn: columnId,
      } as PartialStructuredQuery;
      return _applyQueryChange(state, newQuery);
    },

    /** Set the direction that we are ordering by. */
    setOrderByDirection: (
      state: DataExplorerAppState,
      direction: OrderByDirection | undefined,
    ) => {
      const newQuery = {
        ...state.query,
        orderByDirection: direction,
      } as PartialStructuredQuery;
      return _applyQueryChange(state, newQuery);
    },

    /** Set the LIMIT clause for the query. */
    setLimit: (state: DataExplorerAppState, limit: number | undefined) => {
      const newQuery = {
        ...state.query,
        limit,
      } as PartialStructuredQuery;
      return _applyQueryChange(state, newQuery);
    },

    /**
     * Set the recursive filter tree on the structured query, which also
     * regenerates the raw SQL via knex.
     */
    setFilters: (state: DataExplorerAppState, filters: QueryFilterGroup) => {
      const newQuery = {
        ...state.query,
        filters,
      } as PartialStructuredQuery;
      return _applyQueryChange(state, newQuery);
    },

    /**
     * Apply the output of `sqlToStructuredQuery` to state: replace the
     * structured form with the parsed query, leave the raw SQL untouched,
     * and record whether the mapping was lossy.
     */
    applySqlMapping: (
      state: DataExplorerAppState,
      payload: {
        query: PartialStructuredQuery;
        isFullyMapped: boolean;
        unmappedReasons: readonly string[];
      },
    ): DataExplorerAppState => {
      return {
        ...state,
        query: payload.query,
        isStructuredQueryInSync: payload.isFullyMapped,
        sqlSyncWarnings: payload.unmappedReasons,
      };
    },

    /** Reset the filter tree to the empty group. */
    clearFilters: (state: DataExplorerAppState): DataExplorerAppState => {
      const newQuery = {
        ...state.query,
        filters: EMPTY_QUERY_FILTER,
      } as PartialStructuredQuery;
      return _applyQueryChange(state, newQuery);
    },

    /**
     * Change the active visualization.
     *
     * Converts the config and applies structured `hydrateFromQuery`.
     * Result-based `hydrateFromQueryResult` runs in `DataExplorerApp` when
     * query results are present (see `syncVizFromQueryResult`).
     */
    setActiveVizType: (state: DataExplorerAppState, newVizType: VizType) => {
      const { vizConfig, query } = state;

      return setValue(
        state,
        "vizConfig",
        VizConfigs.hydrateFromQuery(
          VizConfigs.convertVizConfig(vizConfig, newVizType),
          query,
        ),
      );
    },

    /**
     * Clears axis keys missing from the latest result columns and applies
     * `hydrateFromQueryResult` when `shouldHydrateVizFromQueryResult` is true.
     */
    syncVizFromQueryResult: (
      state: DataExplorerAppState,
      columns: readonly QueryResultColumn[],
    ) => {
      const next = applyVizConfigFromQueryResult({
        vizConfig: state.vizConfig,
        rawSQL: state.rawSQL,
        query: state.query,
        columns,
      });

      const columnsChanged = !_sameColumnSchema(
        state.lastResultColumns,
        columns,
      );
      const vizConfigChanged = !isVizConfigEqualForQueryResultSync(
        next,
        state.vizConfig,
      );

      if (!columnsChanged && !vizConfigChanged) {
        return state;
      }

      return {
        ...state,
        ...(vizConfigChanged ? { vizConfig: next } : {}),
        ...(columnsChanged ? { lastResultColumns: columns } : {}),
      };
    },

    setVizConfig: (state: DataExplorerAppState, vizConfig: VizConfig) => {
      // fill in the defaults
      return setValue(state, "vizConfig", vizConfig);
    },

    setRawSql: (state: DataExplorerAppState, rawSql: string | undefined) => {
      // When SQL is cleared we are trivially back in sync (both empty).
      if (rawSql === undefined || rawSql === "") {
        return {
          ...state,
          rawSQL: undefined,
          isStructuredQueryInSync: true,
          sqlSyncWarnings: [],
        };
      }
      // Setting raw SQL via this action does not run the parser; the parser
      // is wired up in the SQL view because it needs dataset metadata. Mark
      // the form as potentially out of sync so the UI can surface that.
      return {
        ...state,
        rawSQL: rawSql,
        isStructuredQueryInSync: false,
        sqlSyncWarnings: state.sqlSyncWarnings,
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
        sqlSyncWarnings: readonly string[];
      },
    ): DataExplorerAppState => {
      return {
        ...state,
        isStructuredQueryInSync: payload.isStructuredQueryInSync,
        sqlSyncWarnings: payload.sqlSyncWarnings,
      };
    },

    /**
     * Record the natural-language prompt that produced the current `rawSQL`.
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

    /** Reset the Data Explorer to its initial (blank) state. */
    resetState: (_state: DataExplorerAppState): DataExplorerAppState => {
      return INITIAL_DATA_EXPLORER_STATE;
    },
  },
});

/**
 * Returns true when two column lists describe the same result schema —
 * same length, names, and data types, in order. Used by
 * `syncVizFromQueryResult` to avoid re-emitting state on identical refetches.
 */
function _sameColumnSchema(
  prev: readonly QueryResultColumn[] | undefined,
  next: readonly QueryResultColumn[],
): boolean {
  if (prev === undefined) {
    return next.length === 0;
  }
  if (prev.length !== next.length) {
    return false;
  }
  for (let i = 0; i < next.length; i++) {
    const a = prev[i]!;
    const b = next[i]!;
    if (a.name !== b.name || a.dataType !== b.dataType) {
      return false;
    }
  }
  return true;
}
