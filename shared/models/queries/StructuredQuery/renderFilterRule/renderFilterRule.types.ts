import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryFilterColumnTypes } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/** A SQL snippet plus its positional bindings, ready for knex `*Raw` calls. */
export type SqlFragment = {
  sql: string;
  bindings: unknown[];
};

/** Options for rendering one filter rule to SQL. */
export type RenderFilterRuleOptions = {
  /**
   * Live column types, keyed by column ID. Takes precedence over the type
   * stored on the rule, so a column whose type the user changed renders with
   * the new type.
   */
  columnTypes?: Readonly<QueryFilterColumnTypes>;
  /** Model-derived expression for the source or projection identity. */
  getColumn?: (
    columnId: QueryColumn.Id,
  ) => { sql: string; dataType: AvaDataType.T } | undefined;
};

/**
 * The already-resolved pieces of a rule that every predicate shape is built
 * from. Computing them once is what keeps case folding and temporal casting
 * consistent across all 26 operators.
 */
export type FilterPredicateParts = {
  /** The quoted column reference, with no case folding applied. */
  column: string;
  /** The comparison target: `column`, wrapped in `lower(...)` when folding. */
  leftSide: string;
  /** The bind placeholder, cast or case-folded to match `leftSide`. */
  placeholder: string;
};
