import { Model } from "@avandar/models";
import { QueryColumnReconciliation } from "$/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { applyQueryChange } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers";
import { applyDefaultManualQueryLimit } from "@/views/DataExplorerApp/manualQueryLimit/manualQueryLimit";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { DataExplorerAppState } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";

function _getQueryFromSourceColumns(options: {
  query: StructuredQuery.Partial;
  columns: readonly QueryColumn.T[];
}): StructuredQuery.Partial {
  const { query, columns } = options;
  const selectedColumns = query.queryColumns.flatMap((selected) => {
    const source = columns.find((column) => {
      return (
        column.baseColumn.__type === selected.baseColumn.__type &&
        column.baseColumn.id === selected.baseColumn.id
      );
    });
    return source ? [{ ...selected, baseColumn: source.baseColumn }] : [];
  });
  const reconciled = QueryColumnReconciliation.reconcileSelectedColumns({
    previous: query.queryColumns,
    incoming: selectedColumns,
    aggregations: query.aggregations,
  });
  return {
    ...query,
    sourceColumns: columns,
    queryColumns: reconciled.columns,
    aggregations: reconciled.aggregations,
    orderByColumn: selectedColumns.some((column) => {
      return column.id === query.orderByColumn;
    })
      ? query.orderByColumn
      : undefined,
  };
}
/** Source selection and metadata reconciliation actions for Data Explorer. */
export const DataExplorerSourceActions = {
  /** Set the data source for the query. */
  setDataSource: (
    state: DataExplorerAppState,
    payload: {
      dataSource: QueryDataSource.T | undefined;
      options?: { limit?: number };
    },
  ): DataExplorerAppState => {
    const { dataSource, options } = payload;
    const sourceKey = dataSource ? Model.getTypedId(dataSource) : undefined;
    const previousKey = state.query.dataSource
      ? Model.getTypedId(state.query.dataSource)
      : undefined;
    const isSameSource =
      sourceKey?.__type === previousKey?.__type &&
      sourceKey?.id === previousKey?.id;
    const newQuery = applyDefaultManualQueryLimit({
      ...state.query,
      ...(!isSameSource
        ? {
            queryColumns: [],
            aggregations: {},
            orderByColumn: undefined,
            sourceColumns: undefined,
          }
        : {}),
      dataSource,
      ...(options?.limit !== undefined ? { limit: options.limit } : {}),
    } as StructuredQuery.Partial);
    const updatedState = applyQueryChange({ state, newQuery });
    return isSameSource
      ? updatedState
      : {
          ...updatedState,
          sourceCatalog: {
            sourceKey,
            status: "loading" as const,
            columns: [],
          },
        };
  },

  /** Accepts source metadata only for the currently selected source. */
  setSourceColumns: (
    state: DataExplorerAppState,
    catalog: NonNullable<DataExplorerAppState["sourceCatalog"]>,
  ): DataExplorerAppState => {
    const sourceKey = state.query.dataSource
      ? Model.getTypedId(state.query.dataSource)
      : undefined;
    if (
      sourceKey?.__type !== catalog.sourceKey?.__type ||
      sourceKey?.id !== catalog.sourceKey?.id
    ) {
      return state;
    }
    if (!sourceKey || catalog.status === "loading") {
      return {
        ...state,
        sourceCatalog: {
          ...catalog,
          columns: state.sourceCatalog?.columns ?? [],
        },
      };
    }
    const columns = QueryColumnReconciliation.reconcileSourceColumns({
      sourceKey,
      previousSourceKey: state.sourceCatalog?.sourceKey ?? sourceKey,
      previous: state.query.sourceColumns ?? state.sourceCatalog?.columns ?? [],
      incoming: catalog.columns,
    });
    const query = _getQueryFromSourceColumns({ query: state.query, columns });
    const updatedState = state.isStructuredQueryInSync
      ? applyQueryChange({ state, newQuery: query })
      : { ...state, query };
    return {
      ...updatedState,
      queryTrigger: state.queryTrigger,
      sourceCatalog: { ...catalog, columns },
    };
  },

  /** Set the columns for the query. */
  setColumns: (
    state: DataExplorerAppState,
    columns: readonly QueryColumn.T[],
  ): DataExplorerAppState => {
    const { columns: selectedColumns, aggregations } =
      QueryColumnReconciliation.reconcileSelectedColumns({
        previous: state.query.queryColumns,
        incoming: columns,
        aggregations: state.query.aggregations,
      });
    const newQuery = {
      ...state.query,
      queryColumns: selectedColumns,
      aggregations,
      orderByColumn: selectedColumns.some((column) => {
        return column.id === state.query.orderByColumn;
      })
        ? state.query.orderByColumn
        : undefined,
    } as StructuredQuery.Partial;
    const newVizConfig = VizConfigs.hydrateFromQuery(state.vizConfig, newQuery);
    const next = applyQueryChange({ state, newQuery });
    return { ...next, vizConfig: newVizConfig };
  },
};
