import { matchLiteral, prop, propEq } from "@avandar/utils";
import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator.ts";

/**
 * The none-arity operators, which bind no values at all. Derived from the
 * catalog rather than listed, so an operator's arity is declared in exactly one
 * place.
 */
export type ValuelessFilterOperator = Extract<
  (typeof QueryFilterOperator.SPECS)[number],
  { arity: "none" }
>["operator"];

const _VALUELESS_OPERATORS: ReadonlySet<string> = new Set(
  QueryFilterOperator.SPECS.filter(propEq("arity", "none")).map(
    prop("operator"),
  ),
);

/** True when the operator binds no values. */
export function isValuelessFilterOperator(
  operator: QueryFilterOperator,
): operator is ValuelessFilterOperator {
  return _VALUELESS_OPERATORS.has(operator);
}

/**
 * The SQL for a predicate that takes no value. Always compares the unfolded
 * column: there is no user value whose case could differ.
 *
 * `is_blank` renders as `coalesce(trim(col), '') = ''` so a column that is NULL
 * and one that holds only spaces both count as blank, which is what a person
 * means by "empty".
 */
export function getValuelessPredicateSql(
  options: Readonly<{ operator: ValuelessFilterOperator; column: string }>,
): string {
  const { operator, column } = options;
  return matchLiteral(operator, {
    is_null: () => {
      return `${column} IS NULL`;
    },
    is_not_null: () => {
      return `${column} IS NOT NULL`;
    },
    is_blank: () => {
      return `coalesce(trim(${column}), '') = ''`;
    },
    is_not_blank: () => {
      return `coalesce(trim(${column}), '') <> ''`;
    },
    is_true: () => {
      return `${column} IS TRUE`;
    },
    is_false: () => {
      return `${column} IS FALSE`;
    },
  });
}
