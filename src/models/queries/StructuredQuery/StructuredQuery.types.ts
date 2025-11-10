import { QueryAggregationType } from "../QueryAggregationType";
import { UUID } from "@/lib/types/common";
import { QueryDataSource } from "../QueryDataSource/QueryDataSource.types";
import { QueryColumn, QueryColumnId } from "../QueryColumn";
import { Model } from "@/models/Model";

type ModelType = "StructuredQuery";
type CurrentStructuredQueryVersion = 1;

export type OrderByDirection = "asc" | "desc";
export type StructuredQueryId = UUID<ModelType>;

/**
 * This is the canonical representation of a structured query in the Avandar
 * platform for the Data Explorer app. A DuckDB query is generated from this
 * representation to run local queries.
 */
export type StructuredQuery = Model<ModelType, {
  id: StructuredQueryId;

  /**
   * The current version of the StructuredQuery type. These queries can be
   * persisted, so we need to version it.
   */
  version: CurrentStructuredQueryVersion;

  /** The data source we are querying from. */
  dataSource: QueryDataSource;

  /** The columns that are being queried. */
  queryColumns: readonly QueryColumn[];

  /** The column that we are ordering by. */
  orderByColumn: QueryColumnId | undefined;

  /** The direction that we are ordering by. */
  orderByDirection: OrderByDirection | undefined;

  /** The aggregations that are being applied to the query columns */
  aggregations: Record<QueryColumnId, QueryAggregationType>;
}>;

type EmptyStructuredQuery = Model<ModelType, {
  id: StructuredQueryId;
  version: CurrentStructuredQueryVersion;
  dataSource: undefined;
  queryColumns: readonly QueryColumn[];
  orderByColumn: undefined;
  orderByDirection: undefined;
  aggregations: Record<QueryColumnId, QueryAggregationType>;
}>;

/**
 * A StructuredQuery type that is still under construction. This is used in
 * the Data Explorer app when a user is still building their query.
 */
export type PartialStructuredQuery = EmptyStructuredQuery | StructuredQuery;
