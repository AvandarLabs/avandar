import {
  columnRefName,
  extractValueList,
  getBlankCheckColumnNameFromAstNode,
  getBoolFromAstNode,
  getFunctionArgsFromAstNode,
  getFunctionNameFromAstNode,
  isEmptyStringLiteral,
  literalValue,
  toFilterOperator,
  unwrapLowerCall,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts";
import type {
  QueryFilter,
  QueryFilterColumnTypes,
  QueryFilterCombinator,
  QueryFilterGroup,
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { SqlFailedMappingReason } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/SqlFailedMappingReason.types.ts";

const _NEGATED_OPERATOR: Partial<
  Record<QueryFilterOperator, QueryFilterOperator>
> = {
  contains: "not_contains",
  starts_with: "not_starts_with",
  ends_with: "not_ends_with",
  matches_regex: "not_matches_regex",
};

/**
 * Parses the function-call predicates the renderer emits for text matching:
 * `contains`, `starts_with`, `ends_with` (each optionally wrapped in `lower`
 * on both sides), and `regexp_matches`.
 */
function _parseFunctionPredicate(node: unknown): QueryFilterRule | undefined {
  const name = getFunctionNameFromAstNode(node);
  if (!name) {
    return undefined;
  }

  if (name === "regexp_matches") {
    const [column, pattern] = getFunctionArgsFromAstNode(node);
    const columnName = columnRefName(column);
    const value = literalValue(pattern);
    if (columnName === undefined || value === undefined || value === null) {
      return undefined;
    }
    return {
      type: "rule",
      columnName,
      operator: "matches_regex",
      value,
    };
  }

  const operator =
    name === "contains"
      ? "contains"
      : name === "starts_with"
        ? "starts_with"
        : name === "ends_with"
          ? "ends_with"
          : undefined;
  if (!operator) {
    return undefined;
  }

  const [left, right] = getFunctionArgsFromAstNode(node);
  const unwrappedLeft = unwrapLowerCall(left);
  const unwrappedRight = unwrapLowerCall(right);
  const columnName = columnRefName(unwrappedLeft.inner);
  const value = literalValue(unwrappedRight.inner);
  if (columnName === undefined || value === undefined || value === null) {
    return undefined;
  }
  const rule: QueryFilterRule = {
    type: "rule",
    columnName,
    operator,
    value,
  };
  return unwrappedLeft.wasLowered ? rule : { ...rule, matchCase: true };
}

/**
 * Column data types keyed by column name, used to stamp `columnDataType` onto
 * parsed rules so a rule read back from SQL renders typed literals exactly like
 * one authored in the form.
 */
export type ParsedFilterColumnTypes = Readonly<QueryFilterColumnTypes>;

/**
 * Stamps each rule with its column's data type, so a filter read back from SQL
 * renders typed literals exactly like one authored in the form. Without it a
 * numeric rule parsed from `"total" > 30` would re-render as `> '30'`.
 */
export function stampFilterColumnTypes(
  options: Readonly<{
    node: QueryFilter;
    columnTypes: ParsedFilterColumnTypes;
  }>,
): QueryFilter {
  const { node, columnTypes } = options;
  if (node.type === "group") {
    return {
      ...node,
      rules: node.rules.map((child) => {
        return stampFilterColumnTypes({ node: child, columnTypes });
      }),
    };
  }
  const dataType = columnTypes[node.columnName];
  return dataType === undefined ? node : { ...node, columnDataType: dataType };
}

export function parseWhereNode(
  node: unknown,
  unmappedReasons: SqlFailedMappingReason[],
): QueryFilter | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;

  // `NOT <predicate>`: the shape every negated function-form operator takes.
  if (
    obj.type === "unary_expr" &&
    String(obj.operator ?? "").toUpperCase() === "NOT"
  ) {
    const inner = _parseFunctionPredicate(obj.expr);
    if (inner) {
      return {
        ...inner,
        operator: _NEGATED_OPERATOR[inner.operator] ?? inner.operator,
      };
    }
    unmappedReasons.push({
      code: "whereUnsupportedNode",
      nodeType: "unary_expr",
    });
    return undefined;
  }

  // `contains(...)`, `starts_with(...)`, `ends_with(...)`, and
  // `regexp_matches(...)`
  if (obj.type === "function") {
    const rule = _parseFunctionPredicate(obj);
    if (rule) {
      return rule;
    }
    unmappedReasons.push({
      code: "whereUnsupportedNode",
      nodeType: `function:${getFunctionNameFromAstNode(obj) ?? "unknown"}`,
    });
    return undefined;
  }

  if (obj.type !== "binary_expr") {
    unmappedReasons.push({
      code: "whereUnsupportedNode",
      nodeType: String(obj.type),
    });
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

  // `coalesce(trim(col), '') = ''` / `<> ''`  ->  is_blank / is_not_blank
  const blankColumn = getBlankCheckColumnNameFromAstNode(obj.left);
  if (
    blankColumn !== undefined &&
    isEmptyStringLiteral(obj.right) &&
    (operator === "=" || operator === "<>" || operator === "!=")
  ) {
    const rule: QueryFilterRule = {
      type: "rule",
      columnName: blankColumn,
      operator: operator === "=" ? "is_blank" : "is_not_blank",
      value: null,
    };
    return rule;
  }

  // Leaf comparison. The left side may be wrapped in `lower(...)` when the
  // rule folds case, which is how `matchCase` survives the round trip.
  const unwrappedLeft = unwrapLowerCall(obj.left);
  const columnName = columnRefName(unwrappedLeft.inner);
  const isCaseFolded = unwrappedLeft.wasLowered;
  if (!columnName) {
    unmappedReasons.push({ code: "whereNonColumnLeftSide" });
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
    const booleanLiteral = getBoolFromAstNode(obj.right);
    if (booleanLiteral !== undefined) {
      const isTrue = operator === "IS" ? booleanLiteral : !booleanLiteral;
      const rule: QueryFilterRule = {
        type: "rule",
        columnName,
        operator: isTrue ? "is_true" : "is_false",
        value: null,
      };
      return rule;
    }
    unmappedReasons.push({ code: "whereNonNullRightSide", operator });
    return undefined;
  }

  if (operator === "BETWEEN" || operator === "NOT BETWEEN") {
    const valueList = extractValueList(obj.right);
    if (!valueList || valueList.length !== 2) {
      unmappedReasons.push({ code: "whereBetweenUnrepresentable", columnName });
      return undefined;
    }
    const rule: QueryFilterRule = {
      type: "rule",
      columnName,
      operator: operator === "BETWEEN" ? "between" : "not_between",
      value: valueList,
    };
    return rule;
  }

  if (operator === "IN" || operator === "NOT IN") {
    const valueList = extractValueList(obj.right);
    if (!valueList) {
      unmappedReasons.push({
        code: "whereNonLiteralList",
        operator,
        columnName,
      });
      return undefined;
    }
    const rule: QueryFilterRule = {
      type: "rule",
      columnName,
      operator: operator === "IN" ? "in" : "not_in",
      value: valueList,
      ...(isCaseFolded ? {} : { matchCase: true }),
    };
    return rule;
  }

  const filterOp = toFilterOperator(operator);
  if (!filterOp) {
    unmappedReasons.push({ code: "whereUnsupportedOperator", operator });
    return undefined;
  }

  const literal = literalValue(unwrapLowerCall(obj.right).inner);
  if (literal === undefined) {
    unmappedReasons.push({ code: "whereNonLiteralComparison", columnName });
    return undefined;
  }

  const isEquality = filterOp === "=" || filterOp === "!=";
  const rule: QueryFilterRule = {
    type: "rule",
    columnName,
    operator: filterOp,
    value: literal,
    ...(isEquality && !isCaseFolded ? { matchCase: true } : {}),
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
  unmappedReasons: SqlFailedMappingReason[],
): QueryFilter | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (obj.type !== "binary_expr") {
    unmappedReasons.push({
      code: "havingUnsupportedNode",
      nodeType: String(obj.type),
    });
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
      unmappedReasons.push({
        code: "havingComplexAggregateArgument",
        funcName,
      });
      columnName = funcName.toLowerCase();
    }
  } else if (left?.type === "column_ref") {
    columnName = columnRefName(left);
  }
  if (!columnName) {
    unmappedReasons.push({ code: "havingUnrepresentableLeftSide" });
    return undefined;
  }

  const filterOp = toFilterOperator(operator);
  if (!filterOp) {
    unmappedReasons.push({ code: "havingUnsupportedOperator", operator });
    return undefined;
  }
  const literal = literalValue(obj.right);
  if (literal === undefined) {
    unmappedReasons.push({ code: "havingNonLiteralComparison", columnName });
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
