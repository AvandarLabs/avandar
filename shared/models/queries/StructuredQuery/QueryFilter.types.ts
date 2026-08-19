/**
 * A recursive filter tree that the manual query form uses to express WHERE
 * clauses. Mirrors what user-facing query-builder UIs (Airtable, Notion,
 * react-querybuilder) generate: leaves are simple "column OP value" rules
 * and inner nodes are AND/OR groups that may contain other groups.
 */
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator.ts";

export type { QueryFilterOperator };

/** Combinator for a filter group. */
export type QueryFilterCombinator = "AND" | "OR";

/** Stable identity for a node in the filter tree. */
export type QueryFilterNodeId = string;

/**
 * Column data types keyed by column name. Shared by everything that needs to
 * know a filter column's type: the SQL renderer, the SQL-to-form parser, and
 * the filter controls. Declare it once so the four consumers cannot drift.
 */
export type QueryFilterColumnTypes = Record<string, AvaDataType.T>;

/** A single column-level predicate. */
export type QueryFilterRule = {
  type: "rule";
  /**
   * Stable identity so re-rendering the tree does not remount the row (and
   * therefore does not steal focus from the value input).
   */
  id?: QueryFilterNodeId;
  /** The name of the underlying base column we filter on. */
  columnName: string;
  /**
   * The column's data type at authoring time. Used to render typed literals
   * and to pick the operator list. A live `columnTypes` map overrides it;
   * absent both, the column is treated as text.
   */
  columnDataType?: AvaDataType.T;
  operator: QueryFilterOperator;
  /**
   * The raw value the user typed in. Scalar operators take a primitive;
   * `in` / `not_in` take a non-empty array; `between` / `not_between` take
   * exactly two elements; null-ish and boolean operators ignore it.
   * Comma-joined strings are also accepted so older saved filters still parse.
   */
  value: string | number | boolean | null | ReadonlyArray<string | number>;
  /**
   * Text operators only. Absent means case-insensitive, which is the default
   * for all text comparison.
   */
  matchCase?: boolean;
};

/** A nested AND/OR group. */
export type QueryFilterGroup = {
  type: "group";
  /** Stable group identity so re-rendering does not remount nested rows. */
  id?: QueryFilterNodeId;
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
