import {
  columnRefName,
  extractValueList,
  literalValue,
  toFilterOperator,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts";
import type {
  QueryFilter,
  QueryFilterCombinator,
  QueryFilterGroup,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { SqlMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlMappingReason.types.ts";

export function parseWhereNode(
  node: unknown,
  unmappedReasons: SqlMappingReason[],
): QueryFilter | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "binary_expr") {
    unmappedReasons.push(
      { code: "whereUnsupportedNode", nodeType: String(obj.type) },
    );
    return undefined;
  }

  const operator = String(obj.operator ?? "").toUpperCase();
  if (operator === "AND" || operator === "OR") {
    const left = parseWhereNode(obj.left, unmappedReasons);
    const right = parseWhereNode(obj.right, unmappedReasons);
    const rules: QueryFilter[] = [];
    if (left) {
      if (left.type === "group" && left.combinator === operator) {
        left.rules.forEach((r) => {
          rules.push(r);
        });
      } else {
        rules.push(left);
      }
    }
    if (right) {
      if (right.type === "group" && right.combinator === operator) {
        right.rules.forEach((r) => {
          rules.push(r);
        });
      } else {
        rules.push(right);
      }
    }
    if (rules.length === 0) {
      return undefined;
    }
    const group: QueryFilterGroup = {
      type: "group",
      combinator: operator as QueryFilterCombinator,
      rules,
    };
    return group;
  }

  // Leaf comparison
  const columnName = columnRefName(obj.left);
  if (!columnName) {
    unmappedReasons.push(
      { code: "whereNonColumnLeftSide" },
    );
    return undefined;
  }

  // IS NULL / IS NOT NULL
  if (operator === "IS" || operator === "IS NOT") {
    const rightAsBool = (obj.right as { type?: string } | null)?.type;
    if (rightAsBool === "null") {
      const rule: QueryFilterRule = {
        type: "rule",
        columnName,
        operator: operator === "IS" ? "is_null" : "is_not_null",
        value: null,
      };
      return rule;
    }
    unmappedReasons.push(
      { code: "whereNonNullRightSide", operator },
    );
    return undefined;
  }

  if (operator === "BETWEEN") {
    const valueList = extractValueList(obj.right);
    if (!valueList || valueList.length !== 2) {
      unmappedReasons.push(
        { code: "whereBetweenUnrepresentable", columnName },
      );
      return undefined;
    }
    const rule: QueryFilterRule = {
      type: "rule",
      columnName,
      operator: "between",
      value: valueList,
    };
    return rule;
  }

  if (operator === "IN" || operator === "NOT IN") {
    const valueList = extractValueList(obj.right);
    if (!valueList) {
      unmappedReasons.push(
        { code: "whereNonLiteralList", operator, columnName },
      );
      return undefined;
    }
    const rule: QueryFilterRule = {
      type: "rule",
      columnName,
      operator: operator === "IN" ? "in" : "not_in",
      value: valueList,
    };
    return rule;
  }

  const filterOp = toFilterOperator(operator);
  if (!filterOp) {
    unmappedReasons.push(
      { code: "whereUnsupportedOperator", operator },
    );
    return undefined;
  }

  const literal = literalValue(obj.right);
  if (literal === undefined) {
    unmappedReasons.push(
      { code: "whereNonLiteralComparison", columnName },
    );
    return undefined;
  }

  const rule: QueryFilterRule = {
    type: "rule",
    columnName,
    operator: filterOp,
    value: literal,
  };
  return rule;
}

/**
 * Parse a HAVING clause AST node into a filter tree. HAVING typically
 * references aggregate functions; we treat the aggregate as the column
 * (e.g. `count(age)` becomes a rule on the column "age" with an explicit
 * `COUNT(...)` prefix preserved in the renderer).
 */
export function parseHavingNode(
  node: unknown,
  unmappedReasons: SqlMappingReason[],
): QueryFilter | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "binary_expr") {
    unmappedReasons.push(
      { code: "havingUnsupportedNode", nodeType: String(obj.type) },
    );
    return undefined;
  }
  const operator = String(obj.operator ?? "").toUpperCase();
  if (operator === "AND" || operator === "OR") {
    const left = parseHavingNode(obj.left, unmappedReasons);
    const right = parseHavingNode(obj.right, unmappedReasons);
    const rules: QueryFilter[] = [];
    if (left) {
      rules.push(left);
    }
    if (right) {
      rules.push(right);
    }
    if (rules.length === 0) {
      return undefined;
    }
    return {
      type: "group",
      combinator: operator as QueryFilterCombinator,
      rules,
    };
  }

  // Aggregate function on the left: count(col) > 5
  const left = obj.left as Record<string, unknown> | null;
  let columnName: string | undefined;
  if (left?.type === "aggr_func") {
    const funcName = String(left.name ?? "");
    const args = left.args as { expr?: unknown } | undefined;
    const innerCol = columnRefName(args?.expr);
    if (innerCol) {
      columnName = `${funcName.toLowerCase()}(${innerCol})`;
    } else {
      unmappedReasons.push(
        { code: "havingComplexAggregateArgument", funcName },
      );
      columnName = funcName.toLowerCase();
    }
  } else if (left?.type === "column_ref") {
    columnName = columnRefName(left);
  }
  if (!columnName) {
    unmappedReasons.push(
      { code: "havingUnrepresentableLeftSide" },
    );
    return undefined;
  }

  const filterOp = toFilterOperator(operator);
  if (!filterOp) {
    unmappedReasons.push(
      { code: "havingUnsupportedOperator", operator },
    );
    return undefined;
  }
  const literal = literalValue(obj.right);
  if (literal === undefined) {
    unmappedReasons.push(
      { code: "havingNonLiteralComparison", columnName },
    );
    return undefined;
  }
  const rule: QueryFilterRule = {
    type: "rule",
    columnName,
    operator: filterOp,
    value: literal,
  };
  return rule;
}
