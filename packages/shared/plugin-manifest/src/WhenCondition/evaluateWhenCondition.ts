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
    default:
      return false;
  }
}

function _evaluateFactComparison(
  comparison: FactComparison,
  facts: WhenFacts,
): boolean {
  const comparisonEntries = Object.entries(comparison);
  const [comparisonEntry] = comparisonEntries;
  if (comparisonEntries.length !== 1 || comparisonEntry === undefined) {
    return false;
  }
  const [factName, operators] = comparisonEntry;
  const actualValue = facts[factName];
  const operatorEntries = Object.entries(operators);
  if (actualValue === undefined || operatorEntries.length === 0) {
    return false;
  }
  return operatorEntries.every(([operator, expectedValue]) => {
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
 * Lists every fact name a condition references, at any depth under `all`,
 * `any`, and `not`.
 */
function _collectFactNames(condition: WhenCondition): readonly string[] {
  if (isAllCondition(condition)) {
    return condition.all.flatMap((child) => {
      return _collectFactNames(child);
    });
  }
  if (isAnyCondition(condition)) {
    return condition.any.flatMap((child) => {
      return _collectFactNames(child);
    });
  }
  if (isNotCondition(condition)) {
    return _collectFactNames(condition.not);
  }
  return Object.keys(condition);
}

function _evaluateCondition(
  condition: WhenCondition,
  facts: WhenFacts,
): boolean {
  if (isAllCondition(condition)) {
    return condition.all.every((child) => {
      return _evaluateCondition(child, facts);
    });
  }
  if (isAnyCondition(condition)) {
    return condition.any.some((child) => {
      return _evaluateCondition(child, facts);
    });
  }
  if (isNotCondition(condition)) {
    return !_evaluateCondition(condition.not, facts);
  }
  return _evaluateFactComparison(condition, facts);
}

/**
 * Decides whether a contribution is shown, by evaluating its `when` condition
 * against the facts the slot provides. For example, a plugin's Data Explorer
 * toolbar button declared with the condition below shows only when the current
 * query result has rows:
 *
 *     { all: [{ hasResult: { eq: true } }, { rowCount: { gt: 0 } }] }
 *
 * A missing condition is always true. Any fact the condition references that
 * the slot did not provide makes the whole condition false, even under `not`
 * or `any`, so a contribution stays hidden rather than appearing in a slot it
 * was not written for.
 */
export function evaluateWhenCondition(
  condition: WhenCondition | undefined,
  facts: WhenFacts,
): boolean {
  if (condition === undefined) {
    return true;
  }
  const hasMissingFact = _collectFactNames(condition).some((factName) => {
    return facts[factName] === undefined;
  });
  if (hasMissingFact) {
    return false;
  }
  return _evaluateCondition(condition, facts);
}
