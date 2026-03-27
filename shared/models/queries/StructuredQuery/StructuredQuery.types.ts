import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type {
  QueryColumn,
  QueryColumnId,
} from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types.ts";
import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";

type ModelType = "StructuredQuery";
type CurrentStructuredQueryVersion = 1;

export type OrderByDirection = "asc" | "desc";
export type StructuredQueryId = UUID<ModelType>;

/**
 * This is the canonical representation of a structured query in the Avandar
 * platform for the Data Explorer app. A DuckDB query is generated from this
 * representation to run local queries.
 */
export type StructuredQueryRead = Model.Versioned<
  ModelType,
  CurrentStructuredQueryVersion,
  {
    id: StructuredQueryId;

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

    /** The offset of the query. */
    offset: number | undefined;

    /** The limit of the query. */
    limit: number | undefined;
  }
>;

type EmptyStructuredQuery = Model.Versioned<
  ModelType,
  CurrentStructuredQueryVersion,
  {
    id: StructuredQueryId;
    dataSource: undefined;
    queryColumns: readonly QueryColumn[];
    orderByColumn: undefined;
    orderByDirection: undefined;
    aggregations: Record<QueryColumnId, QueryAggregationType>;
    offset: undefined;
    limit: undefined;
  }
>;

/**
 * A StructuredQuery type that is still under construction. This is used in
 * the Data Explorer app when a user is still building their query.
 */
export type PartialStructuredQuery = EmptyStructuredQuery | StructuredQueryRead;
