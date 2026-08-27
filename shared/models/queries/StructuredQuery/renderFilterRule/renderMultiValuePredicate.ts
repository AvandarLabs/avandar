import { matchLiteral } from "@avandar/utils";
import { match } from "ts-pattern";
import { QueryFilterValue } from "$/models/queries/StructuredQuery/QueryFilterValue/QueryFilterValue.ts";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator.ts";
import type {
  FilterPredicateParts,
  SqlFragment,
} from "$/models/queries/StructuredQuery/renderFilterRule/renderFilterRule.types.ts";

/**
 * The operators that bind more than one value: the list and pair arities.
 * Derived from the catalog rather than listed, so an operator's arity is
 * declared in exactly one place.
 */
export type MultiValueFilterOperator = Extract<
  (typeof QueryFilterOperator.SPECS)[number],
  { arity: "list" } | { arity: "pair" }
>["operator"];

/**
 * Renders `in` / `not_in` / `between` / `not_between`, which are the operators
 * whose placeholder count depends on the value. Returns `undefined` when a
 * `between` is missing a bound, which is how a half-filled range is excluded
 * rather than rendered as a comparison against nothing.
 */
export function renderMultiValuePredicate(
  options: Readonly<{
    operator: MultiValueFilterOperator;
    value: QueryFilterRule["value"];
    parts: FilterPredicateParts;
    makeLiteral: (value: string | number | boolean) => unknown;
  }>,
): SqlFragment | undefined {
  const { value, parts, makeLiteral } = options;
  return match(options.operator)
    .with("in", "not_in", (operator) => {
      const items = QueryFilterValue.getList({ value });
      const placeholders = items
        .map(() => {
          return parts.placeholder;
        })
        .join(", ");
      const keyword = matchLiteral(operator, { in: "IN", not_in: "NOT IN" });
      return {
        sql: `${parts.leftSide} ${keyword} (${placeholders})`,
        bindings: items.map((item) => {
          return makeLiteral(item);
        }),
      };
    })
    .with("between", "not_between", (operator) => {
      const pair = QueryFilterValue.getPair(value);
      if (!pair) {
        return undefined;
      }
      const keyword = matchLiteral(operator, {
        between: "BETWEEN",
        not_between: "NOT BETWEEN",
      });
      // Compares the unfolded column: both bounds are ordered values, so case
      // folding would not change which rows match.
      return {
        sql: `${parts.column} ${keyword} ${parts.placeholder} AND ${parts.placeholder}`,
        bindings: [makeLiteral(pair[0]), makeLiteral(pair[1])],
      };
    })
    .exhaustive();
}
