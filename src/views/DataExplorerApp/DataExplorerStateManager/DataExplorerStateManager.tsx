import { makeObject } from "@/lib/utils/objects/builders";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { setValue } from "@/lib/utils/objects/setValue";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";
import { QueryAggregationType } from "@/models/queries/QueryAggregationType";
import { QueryColumn, QueryColumnId } from "@/models/queries/QueryColumn";
import { QueryDataSource } from "@/models/queries/QueryDataSource";
import {
  OrderByDirection,
  PartialStructuredQuery,
} from "@/models/queries/StructuredQuery";
import { StructuredQueries } from "@/models/queries/StructuredQuery/StructuredQueries";
import { VizConfig, VizConfigs, VizType } from "@/models/vizs/VizConfig";

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
  query: StructuredQueries.makeEmpty(),
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

    /** Change the active visualization */
    setActiveVizType: (state: DataExplorerAppState, newVizType: VizType) => {
      const { vizConfig, query } = state;

      // convert the viz config and then hydrate it from the query, so we can
      // populate it with some reasonable default values
      return setValue(
        state,
        "vizConfig",
        VizConfigs.hydrateFromQuery(
          VizConfigs.convertVizConfig(vizConfig, newVizType),
          query,
        ),
      );
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
