import { quoteSqlIdentifier } from "@utils/sql/index.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { operatorSpec } from "$/models/queries/StructuredQuery/QueryFilterOperator.ts";
import { isFilterRuleComplete } from "$/models/queries/StructuredQuery/QueryFilterValidation.ts";
import {
  coerceFilterLiteral,
  filterValueAsList,
  filterValueAsPair,
  filterValueAsScalar,
} from "$/models/queries/StructuredQuery/QueryFilterValue.ts";
import { match } from "ts-pattern";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/** A SQL snippet plus its positional bindings, ready for knex `*Raw` calls. */
export type SqlFragment = {
  sql: string;
  bindings: readonly unknown[];
};

export type RenderFilterRuleOptions = {
  /**
   * Live column types, keyed by column name. Takes precedence over the type
   * stored on the rule, so a column whose type the user changed renders with
   * the new type.
   */
  columnTypes?: Readonly<Record<string, AvaDataTypeNs.T>>;
};

function _castTarget(dataType: AvaDataTypeNs.T): string {
  return match(dataType)
    .with("date", () => {
      return "DATE";
    })
    .with("timestamp", () => {
      return "TIMESTAMP";
    })
    .with("time", () => {
      return "TIME";
    })
    .otherwise(() => {
      return "VARCHAR";
    });
}

/**
 * Renders one filter rule to SQL. Returns `undefined` when the rule is
 * incomplete or its operator is unknown, which is how incomplete rules get
 * excluded from the query instead of running as `col = ''`.
 *
 * Text matching uses DuckDB's `contains` / `starts_with` / `ends_with`
 * functions rather than `LIKE` patterns. That makes a `%` in the user's value a
 * literal character (no escaping to get wrong) and keeps every predicate in a
 * shape `node-sql-parser` can read back, which the round-trip test enforces.
 */
export function renderFilterRule(
  rule: QueryFilterRule,
  options: RenderFilterRuleOptions = {},
): SqlFragment | undefined {
  const spec = operatorSpec(rule.operator);
  if (!spec || !isFilterRuleComplete(rule)) {
    return undefined;
  }

  const dataType =
    options.columnTypes?.[rule.columnName] ?? rule.columnDataType;
  const column = quoteSqlIdentifier(rule.columnName);
  const isTextColumn = dataType === undefined || AvaDataType.isText(dataType);
  const foldCase =
    spec.supportsMatchCase && isTextColumn && rule.matchCase !== true;
  const lhs = foldCase ? `lower(${column})` : column;
  const isTemporal = dataType !== undefined && AvaDataType.isTemporal(dataType);
  const placeholder =
    isTemporal ? `CAST(? AS ${_castTarget(dataType)})`
    : foldCase ? "lower(?)"
    : "?";

  function literal(value: string | number | boolean): unknown {
    return coerceFilterLiteral(value, dataType);
  }

  function scalarBinding(): readonly unknown[] {
    const value = filterValueAsScalar(rule.value);
    return value === undefined ? [] : [literal(value)];
  }

  return match(rule.operator)
    .with("=", () => {
      return { sql: `${lhs} = ${placeholder}`, bindings: scalarBinding() };
    })
    .with("!=", () => {
      return { sql: `${lhs} <> ${placeholder}`, bindings: scalarBinding() };
    })
    .with(">", ">=", "<", "<=", (operator) => {
      return {
        sql: `${lhs} ${operator} ${placeholder}`,
        bindings: scalarBinding(),
      };
    })
    .with("contains", () => {
      return {
        sql: `contains(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("not_contains", () => {
      return {
        sql: `NOT contains(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("starts_with", () => {
      return {
        sql: `starts_with(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("not_starts_with", () => {
      return {
        sql: `NOT starts_with(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("ends_with", () => {
      return {
        sql: `ends_with(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("not_ends_with", () => {
      return {
        sql: `NOT ends_with(${lhs}, ${placeholder})`,
        bindings: scalarBinding(),
      };
    })
    .with("in", "not_in", (operator) => {
      const items = filterValueAsList(rule.value);
      const placeholders = items
        .map(() => {
          return placeholder;
        })
        .join(", ");
      const keyword = operator === "in" ? "IN" : "NOT IN";
      return {
        sql: `${lhs} ${keyword} (${placeholders})`,
        bindings: items.map((item) => {
          return literal(item);
        }),
      };
    })
    .with("between", "not_between", (operator) => {
      const pair = filterValueAsPair(rule.value);
      if (!pair) {
        return undefined;
      }
      const keyword = operator === "between" ? "BETWEEN" : "NOT BETWEEN";
      return {
        sql: `${column} ${keyword} ${placeholder} AND ${placeholder}`,
        bindings: [literal(pair[0]), literal(pair[1])],
      };
    })
    .with("is_null", () => {
      return { sql: `${column} IS NULL`, bindings: [] };
    })
    .with("is_not_null", () => {
      return { sql: `${column} IS NOT NULL`, bindings: [] };
    })
    .with("is_blank", () => {
      return { sql: `coalesce(trim(${column}), '') = ''`, bindings: [] };
    })
    .with("is_not_blank", () => {
      return { sql: `coalesce(trim(${column}), '') <> ''`, bindings: [] };
    })
    .with("is_true", () => {
      return { sql: `${column} IS TRUE`, bindings: [] };
    })
    .with("is_false", () => {
      return { sql: `${column} IS FALSE`, bindings: [] };
    })
    .with("matches_regex", () => {
      return {
        sql: `regexp_matches(${column}, ?)`,
        bindings: scalarBinding(),
      };
    })
    .with("not_matches_regex", () => {
      return {
        sql: `NOT regexp_matches(${column}, ?)`,
        bindings: scalarBinding(),
      };
    })
    .with("like", () => {
      return { sql: `${column} LIKE ?`, bindings: scalarBinding() };
    })
    .with("not_like", () => {
      return { sql: `${column} NOT LIKE ?`, bindings: scalarBinding() };
    })
    .exhaustive();
}
