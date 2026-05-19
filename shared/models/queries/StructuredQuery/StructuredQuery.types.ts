import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
import type {
  QueryColumnId,
  QueryColumnRead,
} from "$/models/queries/QueryColumn/QueryColumn.types.ts";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  NestedSubquerySource,
  QueryJoin,
} from "$/models/queries/StructuredQuery/QueryJoin.types.ts";

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

    /**
     * Set when the SQL came in as `FROM (SELECT ...) AS alias` rather than
     * `FROM <dataset>`. The string still tracks `dataSource` but the
     * `nestedSubquery` snapshot keeps the original SQL so the SQL view can
     * round-trip the query unchanged. When this is set the form treats the
     * subquery as opaque (the user can edit the outer query and the inner
     * SQL stays put).
     */
    nestedSubquery?: NestedSubquerySource;

    /** The columns that are being queried. */
    queryColumns: readonly QueryColumnRead[];

    /** The column that we are ordering by. */
    orderByColumn: QueryColumnId | undefined;

    /** The direction that we are ordering by. */
    orderByDirection: OrderByDirection | undefined;

    /** The aggregations that are being applied to the query columns */
    aggregations: Record<QueryColumnId, QueryAggregationType.T>;

    /**
     * Recursive WHERE-clause tree authored via the filter UI. Always a group
     * at the root; an empty group means "no filters".
     */
    filters: QueryFilterGroup;

    /**
     * Recursive HAVING tree. Same shape as `filters`; applied after
     * GROUP BY. Empty group means "no having clause".
     */
    having: QueryFilterGroup;

    /**
     * JOIN clauses, applied in array order. Empty array means "no joins".
     */
    joins: readonly QueryJoin[];

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
    nestedSubquery?: NestedSubquerySource;
    queryColumns: readonly QueryColumnRead[];
    orderByColumn: undefined;
    orderByDirection: undefined;
    aggregations: Record<QueryColumnId, QueryAggregationType.T>;
    filters: QueryFilterGroup;
    having: QueryFilterGroup;
    joins: readonly QueryJoin[];
    offset: undefined;
    limit: undefined;
  }
>;

/**
 * A StructuredQuery type that is still under construction. This is used in
 * the Data Explorer app when a user is still building their query.
 */
export type PartialStructuredQuery = EmptyStructuredQuery | StructuredQueryRead;
