import { createStore } from "@/lib/utils/createStore";
import { setValue } from "@/lib/utils/objects/setValue";
import { uuid } from "@/lib/utils/uuid";
import { QueryAggregationType } from "@/models/queries/QueryAggregationType";
import {
  OrderByDirection,
  PartialStructuredQuery,
} from "@/models/queries/StructuredQuery";
import { VizConfig, VizConfigUtils, VizType } from "@/models/vizs/VizConfig";
import {
  QueryableColumn,
  QueryableColumnId,
} from "../QueryableColumnMultiSelect";
import { QueryableDataSource } from "../QueryableDataSourceSelect";

type DataExplorerState = {
  query: PartialStructuredQuery;
  vizConfig: VizConfig;
};

const DEFAULT_APP_STATE: DataExplorerState = {
  query: {
    id: uuid(),
    version: 1,
    dataSource: undefined,
    queryColumns: [],
    orderByColumn: undefined,
    orderByDirection: undefined,
    aggregations: {},
  },
  vizConfig: {
    vizType: "table",
  },
};

export const DataExplorerStore = createStore({
  name: "DataExplorer",
  initialState: DEFAULT_APP_STATE,
  actions: {
    /** Set the data source for the query. */
    setDataSource: (
      state: DataExplorerState,
      dataSource: QueryableDataSource | undefined,
    ) => {
      return setValue(state, "query.dataSource", dataSource);
    },

    /** Set the columns for the query. */
    setColumns: (
      state: DataExplorerState,
      columns: readonly QueryableColumn[],
    ) => {
      return setValue(state, "query.queryColumns", columns);
    },

    /** Set the aggregations for the query. */
    setAggregations: (
      state: DataExplorerState,
      aggregations: Record<QueryableColumnId, QueryAggregationType>,
    ) => {
      return setValue(state, "query.aggregations", aggregations);
    },

    /** Set the aggregation for a specific column */
    setColumnAggregation: (
      state: DataExplorerState,
      payload: {
        columnId: QueryableColumnId;
        aggregation: QueryAggregationType;
      },
    ) => {
      const { columnId, aggregation } = payload;
      return setValue(state, "query.aggregations", {
        ...state.query.aggregations,
        [columnId]: aggregation,
      });
    },

    /** */
    setOrderByColumn: (
      state: DataExplorerState,
      columnId: QueryableColumnId | undefined,
    ) => {
      return setValue(state, "query.orderByColumn", columnId);
    },

    /** Set the direction that we are ordering by. */
    setOrderByDirection: (
      state: DataExplorerState,
      direction: OrderByDirection | undefined,
    ) => {
      return setValue(state, "query.orderByDirection", direction);
    },

    /** Change the active visualization */
    setActiveVizType: (state: DataExplorerState, newVizType: VizType) => {
      const { vizConfig, query } = state;
      return setValue(
        state,
        "vizConfig",
        VizConfigUtils.hydrateFromQuery(
          VizConfigUtils.convertVizConfig(vizConfig, newVizType),
          query,
        ),
      );
    },

    setVizConfig: (state: DataExplorerState, vizConfig: VizConfig) => {
      // fill in the defaults
      return setValue(state, "vizConfig", vizConfig);
    },
  },
});
