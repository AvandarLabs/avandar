/**
 * Types that describe JOINs in the manual query form, and the
 * recursive "this dataSource is itself a subquery" shape.
 *
 * Kept in their own file so we can add new join kinds or subquery shapes
 * without touching the canonical `StructuredQuery.types.ts` import graph
 * every time.
 */
import type {
  QueryFilterCombinator,
  QueryFilterGroup,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/** Standard SQL join kinds the form supports. */
export type QueryJoinKind = "inner" | "left" | "right" | "full" | "cross";

/**
 * A single ON-clause predicate that connects two tables. We restrict this
 * to a simple `left.column = right.column` equality (the kind LLM-generated
 * SQL produces 95% of the time). Anything fancier should round-trip via
 * `unmappedReasons`.
 */
export type QueryJoinOnEquality = {
  type: "equality";
  /** Bare column name on the LEFT side of the join. */
  leftColumn: string;
  /**
   * Bare column name on the RIGHT side of the join. Both are unqualified
   * because knex applies the join's own alias when emitting SQL.
   */
  rightColumn: string;
  /**
   * Optional table prefix for the left and right sides. Some LLM-generated
   * SQL writes `a.id = b.user_id`; we preserve the prefix here so we can
   * emit it back. The form ignores the prefix when running locally.
   */
  leftTable?: string;
  rightTable?: string;
};

/** A JOIN target is either a known data source ID or a nested subquery. */
export type QueryJoinTarget =
  | { type: "table"; tableName: string; alias?: string }
  | { type: "subquery"; subqueryId: string; alias: string };

/**
 * One JOIN clause attached to the main FROM. The order in the array is the
 * order in which the joins are emitted; combinator-style chaining is not
 * supported.
 */
export type QueryJoin = {
  id: string;
  kind: QueryJoinKind;
  target: QueryJoinTarget;
  /**
   * The ON clause. Most queries will use a single equality; `combinator`
   * is `AND` by default. We allow multiple predicates so an LLM that
   * produces composite keys still round-trips.
   */
  on: readonly QueryJoinOnEquality[];
  /** Combinator for stitching multiple `on` predicates together. */
  combinator?: QueryFilterCombinator;
};

/**
 * Describes a nested SELECT used as a data source. The Data Explorer form
 * will eventually let a user drill into the subquery and edit it like a
 * full structured query; for now the parser fills this in and the manual
 * form treats subqueries as opaque (the raw SQL keeps the source-of-truth).
 */
export type NestedSubquerySource = {
  type: "subquery";
  /**
   * Stable id for this subquery so JOIN targets / FROM references can point
   * at it.
   */
  id: string;
  /**
   * The full SQL text of the subquery. Kept as a string so we don't need
   * the entire `PartialStructuredQuery` graph to be recursive in v1.
   */
  sql: string;
  /** Optional alias the parent query uses to reference the subquery. */
  alias?: string;
  /**
   * Optional flag set by the parser when the subquery could not itself be
   * decomposed into structured form. Surfaced through `unmappedReasons`.
   */
  parseFailed?: boolean;
};

/**
 * A query's data source can be either a known dataset (the typical case)
 * or a nested subquery. The manual form picks the right widget based on
 * the discriminant.
 */
export type StructuredQueryDataSource =
  | { type: "dataset"; dataset: unknown }
  | NestedSubquerySource;

/** The optional HAVING clause; reuses the WHERE-style filter tree. */
export type QueryHavingClause = QueryFilterGroup;
