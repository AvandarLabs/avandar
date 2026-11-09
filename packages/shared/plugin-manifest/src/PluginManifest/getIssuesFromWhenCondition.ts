import {
  isAllCondition,
  isAnyCondition,
  isNotCondition,
} from "@plugin-manifest/WhenCondition/whenConditionGuards.ts";
import type { FactType } from "@plugin-manifest/SlotFacts/SlotFactRegistry.ts";
import type {
  FactComparison,
  WhenCondition,
  WhenOperator,
} from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

/**
 * A problem found in a `when` condition and where it sits, in the shape the
 * manifest schema needs to report it as a Zod issue.
 */
export type WhenConditionIssue = Readonly<{
  path: ReadonlyArray<string | number>;
  message: string;
}>;

const OPERATORS_BY_FACT_TYPE = {
  number: ["eq", "ne", "gt", "gte", "lt", "lte", "in"],
  boolean: ["eq", "ne"],
  string: ["eq", "ne", "in"],
} as const satisfies Readonly<Record<FactType, readonly WhenOperator[]>>;

function _isValueOfFactType(value: unknown, factType: FactType): boolean {
  return typeof value === factType;
}

function _collectOperatorShapeIssues(options: {
  factName: string;
  factType: FactType;
  operator: string;
  value: unknown;
  path: ReadonlyArray<string | number>;
}): WhenConditionIssue[] {
  const { factName, factType, operator, value, path } = options;
  const isList = Array.isArray(value);
  if (operator === "in" && (!isList || value.length === 0)) {
    return [
      {
        path,
        message: `"in" needs a non-empty list of values for "${factName}"`,
      },
    ];
  }
  if (operator !== "in" && isList) {
    return [
      {
        path,
        message: `"${operator}" needs a single ${factType} for "${factName}"`,
      },
    ];
  }
  return [];
}

function _collectOperatorIssues(options: {
  factName: string;
  factType: FactType;
  operator: string;
  value: unknown;
  path: ReadonlyArray<string | number>;
}): WhenConditionIssue[] {
  const { factName, factType, operator, value, path } = options;
  const allowed: readonly string[] = OPERATORS_BY_FACT_TYPE[factType];
  if (!allowed.includes(operator)) {
    return [
      {
        path,
        message: `operator "${operator}" does not apply to ${factType} fact "${factName}"`,
      },
    ];
  }
  const operatorPath = [...path, operator];
  const shapeIssues = _collectOperatorShapeIssues({
    ...options,
    path: operatorPath,
  });
  if (shapeIssues.length > 0) {
    return shapeIssues;
  }
  const values = Array.isArray(value) ? value : [value];
  const isValid = values.every((item: unknown) => {
    return _isValueOfFactType(item, factType);
  });
  return isValid
    ? []
    : [{ path: operatorPath, message: `"${factName}" is a ${factType} fact` }];
}

function _collectComparisonIssues(options: {
  comparison: FactComparison;
  slotFacts: Readonly<Record<string, FactType>>;
  path: ReadonlyArray<string | number>;
}): WhenConditionIssue[] {
  const { comparison, slotFacts, path } = options;
  return Object.entries(comparison).flatMap(([factName, operators]) => {
    const factType = slotFacts[factName];
    if (factType === undefined) {
      return [
        {
          path,
          message: `unknown fact "${factName}" for this slot. Known facts: ${Object.keys(slotFacts).join(", ")}`,
        },
      ];
    }
    return Object.entries(operators).flatMap(([operator, value]) => {
      return _collectOperatorIssues({
        factName,
        factType,
        operator,
        value,
        path: [...path, factName],
      });
    });
  });
}

function _collectChildIssues(options: {
  children: readonly WhenCondition[];
  slotFacts: Readonly<Record<string, FactType>>;
  path: ReadonlyArray<string | number>;
}): WhenConditionIssue[] {
  const { children, slotFacts, path } = options;
  return children.flatMap((child, index) => {
    return getIssuesFromWhenCondition({
      condition: child,
      slotFacts,
      path: [...path, index],
    });
  });
}

/**
 * Gets the problems in a `when` condition by checking it against the facts
 * its slot declares: every fact must exist, and every operator and value
 * must fit the fact's type. The manifest schema reports them as Zod issues.
 */
export function getIssuesFromWhenCondition(options: {
  condition: WhenCondition;
  slotFacts: Readonly<Record<string, FactType>>;
  path: ReadonlyArray<string | number>;
}): WhenConditionIssue[] {
  const { condition, slotFacts, path } = options;
  if (isAllCondition(condition)) {
    return _collectChildIssues({
      children: condition.all,
      slotFacts,
      path: [...path, "all"],
    });
  }
  if (isAnyCondition(condition)) {
    return _collectChildIssues({
      children: condition.any,
      slotFacts,
      path: [...path, "any"],
    });
  }
  if (isNotCondition(condition)) {
    return getIssuesFromWhenCondition({
      condition: condition.not,
      slotFacts,
      path: [...path, "not"],
    });
  }
  return _collectComparisonIssues({
    comparison: condition,
    slotFacts,
    path,
  });
}
