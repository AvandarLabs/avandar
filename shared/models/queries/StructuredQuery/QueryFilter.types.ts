/**
 * A recursive filter tree that the manual query form uses to express WHERE
 * clauses. Mirrors what user-facing query-builder UIs (Airtable, Notion,
 * react-querybuilder) generate: leaves are simple "column OP value" rules
 * and inner nodes are AND/OR groups that may contain other groups.
 */

/** Operators we expose in the filter UI. */
export type QueryFilterOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "like"
  | "not_like"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "between";

/** Combinator for a filter group. */
export type QueryFilterCombinator = "AND" | "OR";

/** A single column-level predicate. */
export type QueryFilterRule = {
  type: "rule";
  /** The name of the underlying base column we filter on. */
  columnName: string;
  operator: QueryFilterOperator;
  /**
   * The raw value the user typed in. For `between`/`in` operators we encode
   * the list as a JSON-serializable array of primitives. For `is_null` /
   * `is_not_null` this is ignored.
   */
  value: string | number | boolean | null | ReadonlyArray<string | number>;
};

/** A nested AND/OR group. */
export type QueryFilterGroup = {
  type: "group";
  combinator: QueryFilterCombinator;
  rules: ReadonlyArray<QueryFilterGroup | QueryFilterRule>;
};

/** Either a leaf or a group; the root is always a group. */
export type QueryFilter = QueryFilterGroup | QueryFilterRule;

/** The empty filter the manual form starts with. */
export const EMPTY_QUERY_FILTER: QueryFilterGroup = {
  type: "group",
  combinator: "AND",
  rules: [],
};

/** True if `filter` is a group node that contains no rules. */
export function isEmptyQueryFilter(filter: QueryFilter | undefined): boolean {
  return (
    filter !== undefined && filter.type === "group" && filter.rules.length === 0
  );
}
