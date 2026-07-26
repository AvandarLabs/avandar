import {
  _columnRefName,
  _extractValueList,
  _literalValue,
  _toFilterOperator,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts";
import type {
  QueryFilter,
  QueryFilterCombinator,
  QueryFilterGroup,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

export function _parseWhereNode(
  node: unknown,
  unmappedReasons: string[],
): QueryFilter | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "binary_expr") {
    unmappedReasons.push(
      `WHERE clause contains a "${String(obj.type)}" node that the form does not support.`,
    );
    return undefined;
  }

  const operator = String(obj.operator ?? "").toUpperCase();
  if (operator === "AND" || operator === "OR") {
    const left = _parseWhereNode(obj.left, unmappedReasons);
    const right = _parseWhereNode(obj.right, unmappedReasons);
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
  const columnName = _columnRefName(obj.left);
  if (!columnName) {
    unmappedReasons.push(
      "WHERE clause uses an expression on the left-hand side that is not a column reference.",
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
      `WHERE clause uses "${operator}" with a non-null right-hand side; only IS NULL / IS NOT NULL are mapped.`,
    );
    return undefined;
  }

  if (operator === "BETWEEN") {
    const valueList = _extractValueList(obj.right);
    if (!valueList || valueList.length !== 2) {
      unmappedReasons.push(
        `WHERE clause uses BETWEEN on "${columnName}" with a value that the form cannot represent.`,
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
    const valueList = _extractValueList(obj.right);
    if (!valueList) {
      unmappedReasons.push(
        `WHERE clause uses "${operator}" on "${columnName}" with a non-literal list.`,
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

  const filterOp = _toFilterOperator(operator);
  if (!filterOp) {
    unmappedReasons.push(
      `WHERE clause uses operator "${operator}" which the form does not support.`,
    );
    return undefined;
  }

  const literal = _literalValue(obj.right);
  if (literal === undefined) {
    unmappedReasons.push(
      `WHERE clause compares "${columnName}" against a non-literal expression.`,
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
export function _parseHavingNode(
  node: unknown,
  unmappedReasons: string[],
): QueryFilter | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "binary_expr") {
    unmappedReasons.push(
      `HAVING clause contains a "${String(obj.type)}" node that the form cannot represent.`,
    );
    return undefined;
  }
  const operator = String(obj.operator ?? "").toUpperCase();
  if (operator === "AND" || operator === "OR") {
    const left = _parseHavingNode(obj.left, unmappedReasons);
    const right = _parseHavingNode(obj.right, unmappedReasons);
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
    const innerCol = _columnRefName(args?.expr);
    if (innerCol) {
      columnName = `${funcName.toLowerCase()}(${innerCol})`;
    } else {
      unmappedReasons.push(
        `HAVING uses aggregate ${funcName} on a complex argument; mapping kept the predicate as a label.`,
      );
      columnName = funcName.toLowerCase();
    }
  } else if (left?.type === "column_ref") {
    columnName = _columnRefName(left);
  }
  if (!columnName) {
    unmappedReasons.push(
      "HAVING clause uses a left-hand side the form cannot represent.",
    );
    return undefined;
  }

  const filterOp = _toFilterOperator(operator);
  if (!filterOp) {
    unmappedReasons.push(
      `HAVING uses operator "${operator}" which the form does not support.`,
    );
    return undefined;
  }
  const literal = _literalValue(obj.right);
  if (literal === undefined) {
    unmappedReasons.push(
      `HAVING compares "${columnName}" against a non-literal expression.`,
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
