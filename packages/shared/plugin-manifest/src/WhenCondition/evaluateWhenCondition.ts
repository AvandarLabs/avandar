import {
  isAllCondition,
  isAnyCondition,
  isNotCondition,
} from "@plugin-manifest/WhenCondition/whenConditionGuards.ts";
import type {
  FactComparison,
  FactValue,
  WhenCondition,
  WhenFacts,
  WhenOperator,
} from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

function _compareFact(options: {
  operator: WhenOperator;
  actualValue: FactValue;
  expectedValue: FactValue | readonly FactValue[];
}): boolean {
  const { operator, actualValue, expectedValue } = options;
  if (operator === "in") {
    return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
  }
  if (operator === "eq") {
    return actualValue === expectedValue;
  }
  if (operator === "ne") {
    return actualValue !== expectedValue;
  }
  if (typeof actualValue !== "number" || typeof expectedValue !== "number") {
    return false;
  }
  switch (operator) {
    case "gt":
      return actualValue > expectedValue;
    case "gte":
      return actualValue >= expectedValue;
    case "lt":
      return actualValue < expectedValue;
    case "lte":
      return actualValue <= expectedValue;
  }
}

function _evaluateFactComparison(
  comparison: FactComparison,
  facts: WhenFacts,
): boolean {
  const [factName, operators] = Object.entries(comparison)[0] ?? [];
  if (factName === undefined || operators === undefined) {
    return false;
  }
  const actualValue = facts[factName];
  if (actualValue === undefined) {
    return false;
  }
  return Object.entries(operators).every(([operator, expectedValue]) => {
    return (
      expectedValue !== undefined &&
      _compareFact({
        operator: operator as WhenOperator,
        actualValue,
        expectedValue,
      })
    );
  });
}

/**
 * Evaluates a `when` condition against a slot's facts. A condition naming a
 * fact the slot did not provide evaluates to false, so a contribution stays
 * hidden rather than appearing somewhere it was not written for.
 */
export function evaluateWhenCondition(
  condition: WhenCondition | undefined,
  facts: WhenFacts,
): boolean {
  if (condition === undefined) {
    return true;
  }
  if (isAllCondition(condition)) {
    return condition.all.every((child) => {
      return evaluateWhenCondition(child, facts);
    });
  }
  if (isAnyCondition(condition)) {
    return condition.any.some((child) => {
      return evaluateWhenCondition(child, facts);
    });
  }
  if (isNotCondition(condition)) {
    return !evaluateWhenCondition(condition.not, facts);
  }
  return _evaluateFactComparison(condition as FactComparison, facts);
}
