
import { isEmptyQueryFilter } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { quoteSqlIdentifier } from "@utils/strings/quoteSqlIdentifier/quoteSqlIdentifier.ts";
import { match } from "ts-pattern";
import type { QueryFilterGroup, QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { Knex } from "knex";

/**
 * Apply a HAVING clause to a knex query, mirroring the WHERE-clause logic
 * but using `havingRaw` so the predicate is rendered after GROUP BY.
 */
export function applyHaving(
  builder: Knex.QueryBuilder,
  group: QueryFilterGroup,
): Knex.QueryBuilder {
  if (isEmptyQueryFilter(group)) {
    return builder;
  }
  return builder.havingRaw(_renderFilterGroupSql(group));
}

function _renderFilterValue(value: QueryFilterRule["value"]): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        return _renderFilterValue(v);
      })
      .join(", ");
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function _renderFilterRuleSql(rule: QueryFilterRule): string {
  const col = quoteSqlIdentifier(rule.columnName);
  return match(rule.operator)
    .with("=", () => {
      return `${col} = ${_renderFilterValue(rule.value)}`;
    })
    .with("!=", () => {
      return `${col} != ${_renderFilterValue(rule.value)}`;
    })
    .with(">", () => {
      return `${col} > ${_renderFilterValue(rule.value)}`;
    })
    .with(">=", () => {
      return `${col} >= ${_renderFilterValue(rule.value)}`;
    })
    .with("<", () => {
      return `${col} < ${_renderFilterValue(rule.value)}`;
    })
    .with("<=", () => {
      return `${col} <= ${_renderFilterValue(rule.value)}`;
    })
    .with("like", () => {
      return `${col} like ${_renderFilterValue(rule.value)}`;
    })
    .with("not_like", () => {
      return `${col} not like ${_renderFilterValue(rule.value)}`;
    })
    .with("in", () => {
      return `${col} in (${_renderFilterValue(rule.value)})`;
    })
    .with("not_in", () => {
      return `${col} not in (${_renderFilterValue(rule.value)})`;
    })
    .with("is_null", () => {
      return `${col} is null`;
    })
    .with("is_not_null", () => {
      return `${col} is not null`;
    })
    .with("between", () => {
      const arr =
        Array.isArray(rule.value) ?
          (rule.value as ReadonlyArray<string | number>)
        : [];
      const start = arr[0];
      const end = arr[1];
      if (start === undefined || end === undefined) {
        return `${col} is not null`;
      }
      return (
        `${col} between ${_renderFilterValue(start)} ` +
        `and ${_renderFilterValue(end)}`
      );
    })
    .exhaustive(() => {
      throw new Error(
        `Unknown filter operator on HAVING rule for "${rule.columnName}".`,
      );
    });
}

function _renderFilterGroupSql(group: QueryFilterGroup): string {
  if (group.rules.length === 0) {
    return "";
  }
  const parts = group.rules.map((node) => {
    if (node.type === "group") {
      const inner = _renderFilterGroupSql(node);
      return inner ? `(${inner})` : "";
    }
    return _renderFilterRuleSql(node);
  });
  return parts.filter(Boolean).join(` ${group.combinator} `);
}
