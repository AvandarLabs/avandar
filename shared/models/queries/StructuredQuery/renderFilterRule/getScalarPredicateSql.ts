import { matchLiteral, prop, propEq } from "@avandar/utils";
import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator.ts";
import type { FilterPredicateParts } from "$/models/queries/StructuredQuery/renderFilterRule/renderFilterRule.types.ts";

/**
 * The scalar-arity operators, which all bind exactly one value. Derived from
 * the catalog rather than listed, so an operator's arity is declared in exactly
 * one place.
 */
export type ScalarFilterOperator = Extract<
  (typeof QueryFilterOperator.SPECS)[number],
  { arity: "scalar" }
>["operator"];

const _SCALAR_OPERATORS: ReadonlySet<string> = new Set(
  QueryFilterOperator.SPECS.filter(propEq("arity", "scalar")).map(
    prop("operator"),
  ),
);

/** True when the operator binds exactly one value. */
export function isScalarFilterOperator(
  operator: QueryFilterOperator,
): operator is ScalarFilterOperator {
  return _SCALAR_OPERATORS.has(operator);
}

/**
 * The SQL for a one-value predicate, with the single bind placeholder already
 * in place.
 *
 * Text matching uses DuckDB's `contains` / `starts_with` / `ends_with`
 * functions rather than `LIKE` patterns. That makes a `%` in the user's value a
 * literal character (no escaping to get wrong) and keeps every predicate in a
 * shape `node-sql-parser` can read back, which the round-trip test enforces.
 *
 * Regex and the legacy `like` operators compare against the unfolded column:
 * their pattern carries its own case semantics, so folding it would change what
 * the pattern means.
 */
export function getScalarPredicateSql(
  options: Readonly<{
    operator: ScalarFilterOperator;
    parts: FilterPredicateParts;
  }>,
): string {
  const { operator } = options;
  const { column, leftSide, placeholder } = options.parts;
  return matchLiteral(operator, {
    "=": () => {
      return `${leftSide} = ${placeholder}`;
    },
    "!=": () => {
      return `${leftSide} <> ${placeholder}`;
    },
    ">": () => {
      return `${leftSide} > ${placeholder}`;
    },
    ">=": () => {
      return `${leftSide} >= ${placeholder}`;
    },
    "<": () => {
      return `${leftSide} < ${placeholder}`;
    },
    "<=": () => {
      return `${leftSide} <= ${placeholder}`;
    },
    contains: () => {
      return `contains(${leftSide}, ${placeholder})`;
    },
    not_contains: () => {
      return `NOT contains(${leftSide}, ${placeholder})`;
    },
    starts_with: () => {
      return `starts_with(${leftSide}, ${placeholder})`;
    },
    not_starts_with: () => {
      return `NOT starts_with(${leftSide}, ${placeholder})`;
    },
    ends_with: () => {
      return `ends_with(${leftSide}, ${placeholder})`;
    },
    not_ends_with: () => {
      return `NOT ends_with(${leftSide}, ${placeholder})`;
    },
    matches_regex: () => {
      return `regexp_matches(${column}, ?)`;
    },
    not_matches_regex: () => {
      return `NOT regexp_matches(${column}, ?)`;
    },
    like: () => {
      return `${column} LIKE ?`;
    },
    not_like: () => {
      return `${column} NOT LIKE ?`;
    },
  });
}
