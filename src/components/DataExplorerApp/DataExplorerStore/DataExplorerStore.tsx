import { createStore } from "@/lib/utils/createStore";
import { setValue } from "@/lib/utils/objects/setValue";
import { uuid } from "@/lib/utils/uuid";
import { QueryAggregationType } from "@/models/queries/QueryAggregationType";
import {
  OrderByDirection,
  PartialStructuredQuery,
} from "@/models/queries/StructuredQuery";
import {
  QueryableColumn,
  QueryableColumnId,
} from "../QueryableColumnMultiSelect";
import { QueryableDataSource } from "../QueryableDataSourceSelect";
import {
  makeDefaultVizConfig,
  VizConfig,
} from "../VizSettingsForm/makeDefaultVizConfig";

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
  vizConfig: makeDefaultVizConfig("table"),
};

export const DataExplorerStore = createStore({
  name: "DataExplorer",
  initialState: DEFAULT_APP_STATE,
  actions: {
    /** Set the data source for the query. */
    setDataSource: (
      state: DataExplorerState,
      payload: { dataSource: QueryableDataSource | undefined },
    ) => {
      return setValue(state, "query.dataSource", payload.dataSource);
    },

    /** Set the columns for the query. */
    setColumns: (
      state: DataExplorerState,
      payload: { columns: readonly QueryableColumn[] },
    ) => {
      return setValue(state, "query.queryColumns", payload.columns);
    },

    /** Set the aggregations for the query. */
    setAggregations: (
      state: DataExplorerState,
      payload: {
        aggregations: Record<QueryableColumnId, QueryAggregationType>;
      },
    ) => {
      return setValue(state, "query.aggregations", payload.aggregations);
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
      payload: { columnId: QueryableColumnId | undefined },
    ) => {
      return setValue(state, "query.orderByColumn", payload.columnId);
    },

    /** Set the direction that we are ordering by. */
    setOrderByDirection: (
      state: DataExplorerState,
      payload: { direction: OrderByDirection | undefined },
    ) => {
      return setValue(state, "query.orderByDirection", payload.direction);
    },

    setVizConfig: (
      state: DataExplorerState,
      payload: { vizConfig: VizConfig },
    ) => {
      return setValue(state, "vizConfig", payload.vizConfig);
    },
  },
});
