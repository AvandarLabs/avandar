
import { isEmptyQueryFilter } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { match } from "ts-pattern";
import type {
  QueryFilter,
  QueryFilterGroup,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { Knex } from "knex";
import { quoteSqlIdentifier } from "$/models/queries/StructuredQuery/structuredQueryToSql/sqlBuilder.ts";

/**
 * Coerce a rule's `value` into a list. Arrays pass through unchanged;
 * strings are split on commas and trimmed. When `dropEmpty` is true (the
 * default, used by `in`/`not_in`) empty entries are removed; `between`
 * keeps them so the two positional bounds line up.
 */
function _ruleValueList(
  value: QueryFilterRule["value"],
  { dropEmpty = true }: { dropEmpty?: boolean } = {},
): ReadonlyArray<string | number> {
  if (Array.isArray(value)) {
    return value as ReadonlyArray<string | number>;
  }
  const parts = String(value ?? "")
    .split(",")
    .map((s) => {
      return s.trim();
    });
  return dropEmpty ? parts.filter(Boolean) : parts;
}

/**
 * Apply a single rule node to a knex query builder.
 */
function _applyFilterRule(
  builder: Knex.QueryBuilder,
  rule: QueryFilterRule,
): Knex.QueryBuilder {
  const column = rule.columnName;
  return match(rule.operator)
    .with("=", () => {
      return builder.where(column, "=", rule.value as Knex.Value);
    })
    .with("!=", () => {
      return builder.where(column, "!=", rule.value as Knex.Value);
    })
    .with(">", () => {
      return builder.where(column, ">", rule.value as Knex.Value);
    })
    .with(">=", () => {
      return builder.where(column, ">=", rule.value as Knex.Value);
    })
    .with("<", () => {
      return builder.where(column, "<", rule.value as Knex.Value);
    })
    .with("<=", () => {
      return builder.where(column, "<=", rule.value as Knex.Value);
    })
    .with("like", () => {
      return builder.where(column, "like", String(rule.value ?? ""));
    })
    .with("not_like", () => {
      return builder.where(column, "not like", String(rule.value ?? ""));
    })
    .with("in", () => {
      const items = _ruleValueList(rule.value);
      return builder.whereIn(column, items as Knex.Value[]);
    })
    .with("not_in", () => {
      const items = _ruleValueList(rule.value);
      return builder.whereNotIn(column, items as Knex.Value[]);
    })
    .with("is_null", () => {
      return builder.whereNull(column);
    })
    .with("is_not_null", () => {
      return builder.whereNotNull(column);
    })
    .with("between", () => {
      const items = _ruleValueList(rule.value, { dropEmpty: false });
      const start = items[0];
      const end = items[1];
      if (start === undefined || end === undefined) {
        return builder;
      }
      return builder.whereBetween(column, [
        start as Knex.Value,
        end as Knex.Value,
      ]);
    })
    .exhaustive(() => {
      throw new Error(`Unknown filter operator on rule for "${column}".`);
    });
}

/**
 * Apply a filter node (group or rule) to a knex query builder, preserving
 * AND/OR semantics for nested groups.
 */
function _applyFilterNode(
  builder: Knex.QueryBuilder,
  node: QueryFilter,
  combinator: "AND" | "OR",
): Knex.QueryBuilder {
  if (node.type === "rule") {
    if (combinator === "OR") {
      return builder.orWhere((sub) => {
        _applyFilterRule(sub as Knex.QueryBuilder, node);
      });
    }
    return _applyFilterRule(builder, node);
  }

  if (node.rules.length === 0) {
    return builder;
  }

  const subFn = (sub: unknown): void => {
    let current = sub as Knex.QueryBuilder;
    node.rules.forEach((child) => {
      current = _applyFilterNode(current, child, node.combinator);
    });
  };

  if (combinator === "OR") {
    return builder.orWhere(subFn);
  }
  return builder.andWhere(subFn);
}

export function applyFilters(
  builder: Knex.QueryBuilder,
  group: QueryFilterGroup,
): Knex.QueryBuilder {
  if (isEmptyQueryFilter(group)) {
    return builder;
  }
  let current = builder;
  group.rules.forEach((child) => {
    current = _applyFilterNode(current, child, group.combinator);
  });
  return current;
}

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

/**
 * Apply each join in order to the knex query builder. Subquery joins use
 * `knex.raw` so we don't need to recursively build a knex sub-builder.
 */
