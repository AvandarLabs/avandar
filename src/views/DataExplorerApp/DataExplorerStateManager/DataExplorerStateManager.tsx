import { prop } from "@utils/objects/hofs/prop/prop";
import { makeObject } from "@utils/objects/makeObject/makeObject";
import { setValue } from "@utils/objects/setValue/setValue";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import {
  applyVizConfigFromQueryResult,
  isVizConfigEqualForQueryResultSync,
} from "$/models/vizs/applyVizConfigFromQueryResult";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.types";
import type {
  QueryColumn,
  QueryColumnId,
} from "$/models/queries/QueryColumn/QueryColumn.types";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types";
import type {
  OrderByDirection,
  PartialStructuredQuery,
} from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type {
  VizConfig,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types";

type DataExplorerAppState = {
  query: PartialStructuredQuery;

  /**
   * If raw SQL was generated, we should use that for our query instead of
   * the structured query.
   */
  rawSQL: string | undefined;
  vizConfig: VizConfig;
};

const initialState: DataExplorerAppState = {
  query: StructuredQuery.makeEmpty(),
  vizConfig: {
    vizType: "table",
  },
  rawSQL: undefined,
};

/**
 * This store is used to manage the state of the Data Explorer app.
 *
 * This store is used at the WorkspaceLayout level therefore it is reachable
 * from any app view in the workspace.
 */
export const DataExplorerStateManager = createAppStateManager({
  name: "DataExplorer",
  initialState,
  actions: {
    /** Set the data source for the query. */
    setDataSource: (
      state: DataExplorerAppState,
      dataSource: QueryDataSource | undefined,
    ) => {
      return setValue(state, "query.dataSource", dataSource);
    },

    /** Set the columns for the query. */
    setColumns: (
      state: DataExplorerAppState,
      columns: readonly QueryColumn[],
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
      };
      const newVizConfig = VizConfigs.hydrateFromQuery(
        state.vizConfig,
        newQuery,
      );

      return { ...state, query: newQuery, vizConfig: newVizConfig };
    },

    /** Set the aggregation for a specific column */
    setColumnAggregation: (
      state: DataExplorerAppState,
      payload: {
        columnId: QueryColumnId;
        aggregation: QueryAggregationType;
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
      };
      const newVizConfig = VizConfigs.hydrateFromQuery(vizConfig, newQuery);
      return {
        ...state,
        query: newQuery,
        vizConfig: newVizConfig,
      };
    },

    /** Set the column that we are ordering by. */
    setOrderByColumn: (
      state: DataExplorerAppState,
      columnId: QueryColumnId | undefined,
    ) => {
      return setValue(state, "query.orderByColumn", columnId);
    },

    /** Set the direction that we are ordering by. */
    setOrderByDirection: (
      state: DataExplorerAppState,
      direction: OrderByDirection | undefined,
    ) => {
      return setValue(state, "query.orderByDirection", direction);
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

      if (isVizConfigEqualForQueryResultSync(next, state.vizConfig)) {
        return state;
      }

      return { ...state, vizConfig: next };
    },

    setVizConfig: (state: DataExplorerAppState, vizConfig: VizConfig) => {
      // fill in the defaults
      return setValue(state, "vizConfig", vizConfig);
    },

    setRawSQL: (state: DataExplorerAppState, rawSQL: string | undefined) => {
      return setValue(state, "rawSQL", rawSQL);
    },
  },
});
