import {
  QueryableColumn,
  QueryableColumnId,
} from "@/components/DataExplorerApp/QueryableColumnMultiSelect";
import { QueryableDataSource } from "@/components/DataExplorerApp/QueryableDataSourceSelect";
import { QueryAggregationType } from "../QueryAggregationType";
import { UUID } from "@/lib/types/common";

export type OrderByDirection = "asc" | "desc";

type CurrentStructuredQueryVersion = 1;

export type StructuredQueryId = UUID<"StructuredQuery">;

/**
 * This is the canonical representation of a structured query in the Avandar
 * platform for the Data Explorer app. A DuckDB query is generated from this
 * representation to run local queries.
 */
export type StructuredQuery = {
  id: StructuredQueryId;

  /**
   * The current version of the StructuredQuery type. These queries can be
   * persisted, so we need to version it.
   */
  version: CurrentStructuredQueryVersion;

  /** The data source we are querying from. */
  dataSource: QueryableDataSource;

  /** The columns that are being queried. */
  queryColumns: readonly QueryableColumn[];

  /** The column that we are ordering by. */
  orderByColumn: QueryableColumnId | undefined;

  /** The direction that we are ordering by. */
  orderByDirection: OrderByDirection | undefined;

  /** The aggregations that are being applied to the query columns */
  aggregations: Record<QueryableColumnId, QueryAggregationType>;
};

type EmptyStructuredQuery = {
  id: StructuredQueryId;
  version: CurrentStructuredQueryVersion;
  dataSource: undefined;
  queryColumns: readonly QueryableColumn[];
  orderByColumn: undefined;
  orderByDirection: undefined;
  aggregations: Record<QueryableColumnId, QueryAggregationType>;
};

/**
 * A StructuredQuery type that is still under construction. This is used in
 * the Data Explorer app when a user is still building their query.
 */
export type PartialStructuredQuery = EmptyStructuredQuery | StructuredQuery;
