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

/** A schema issue located inside a `when` condition. */
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
      const allowed: readonly string[] = OPERATORS_BY_FACT_TYPE[factType];
      if (!allowed.includes(operator)) {
        return [
          {
            path: [...path, factName],
            message: `operator "${operator}" does not apply to ${factType} fact "${factName}"`,
          },
        ];
      }
      const values =
        operator === "in" && Array.isArray(value) ? value : [value];
      const isValid = values.every((item: unknown) => {
        return _isValueOfFactType(item, factType);
      });
      return isValid
        ? []
        : [
            {
              path: [...path, factName, operator],
              message: `"${factName}" is a ${factType} fact`,
            },
          ];
    });
  });
}

/**
 * Checks a `when` condition against the facts its slot declares: every fact
 * must exist, and every operator and value must fit the fact's type.
 */
export function collectWhenConditionIssues(options: {
  condition: WhenCondition;
  slotFacts: Readonly<Record<string, FactType>>;
  path: ReadonlyArray<string | number>;
}): WhenConditionIssue[] {
  const { condition, slotFacts, path } = options;
  if (isAllCondition(condition) || isAnyCondition(condition)) {
    const key = isAllCondition(condition) ? "all" : "any";
    const children = isAllCondition(condition) ? condition.all : condition.any;
    return children.flatMap((child, index) => {
      return collectWhenConditionIssues({
        condition: child,
        slotFacts,
        path: [...path, key, index],
      });
    });
  }
  if (isNotCondition(condition)) {
    return collectWhenConditionIssues({
      condition: condition.not,
      slotFacts,
      path: [...path, "not"],
    });
  }
  return _collectComparisonIssues({
    comparison: condition as FactComparison,
    slotFacts,
    path,
  });
}
