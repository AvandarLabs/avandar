import { match } from "ts-pattern";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator.ts";
import { QueryFilterValue } from "$/models/queries/StructuredQuery/QueryFilterValue/QueryFilterValue.ts";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/**
 * Why a rule cannot be applied. Structured codes rather than sentences: this
 * runs in shared code with no access to the active locale, so the filter
 * value editor renders them.
 */
export type QueryFilterValidationReason =
  | { code: "unknownOperator"; operator: string }
  | {
      code: "operatorNotAllowedForType";
      operator: QueryFilterOperator;
      dataType: AvaDataTypeNs.T;
    }
  | { code: "valueNotANumber"; value: string }
  | { code: "valueNotADate"; value: string }
  | { code: "betweenBoundsReversed" }
  | { code: "regexDoesNotCompile"; value: string };

function _isRuleComplete(rule: QueryFilterRule): boolean {
  if (rule.columnName.trim() === "") {
    return false;
  }
  const spec = QueryFilterOperator.getSpec(rule.operator);
  if (!spec) {
    return false;
  }
  return match(spec.arity)
    .with("none", () => {
      return true;
    })
    .with("scalar", () => {
      return QueryFilterValue.getScalar(rule.value) !== undefined;
    })
    .with("list", () => {
      return QueryFilterValue.getList({ value: rule.value }).length > 0;
    })
    .with("pair", () => {
      return QueryFilterValue.getPair(rule.value) !== undefined;
    })
    .exhaustive();
}

function _isNumericText(value: string | number | boolean): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  const text = String(value).trim();
  return text !== "" && Number.isFinite(Number(text));
}

function _isDateText(value: string | number | boolean): boolean {
  return !Number.isNaN(new Date(String(value)).getTime());
}

function _validateLiteral(
  value: string | number | boolean,
  dataType: AvaDataTypeNs.T | undefined,
): QueryFilterValidationReason | undefined {
  return dataType === undefined
    ? undefined
    : AvaDataType.isNumeric(dataType) && !_isNumericText(value)
      ? { code: "valueNotANumber", value: String(value) }
      : AvaDataType.isTemporal(dataType) && !_isDateText(value)
        ? { code: "valueNotADate", value: String(value) }
        : undefined;
}

function _validateRule(
  rule: QueryFilterRule,
): QueryFilterValidationReason | undefined {
  const spec = QueryFilterOperator.getSpec(rule.operator);
  if (!spec) {
    return { code: "unknownOperator", operator: rule.operator };
  }
  if (
    rule.columnDataType !== undefined &&
    !spec.appliesTo(rule.columnDataType)
  ) {
    return {
      code: "operatorNotAllowedForType",
      operator: rule.operator,
      dataType: rule.columnDataType,
    };
  }
  if (!_isRuleComplete(rule)) {
    return undefined;
  }
  if (
    rule.operator === "matches_regex" ||
    rule.operator === "not_matches_regex"
  ) {
    const pattern = String(QueryFilterValue.getScalar(rule.value));
    try {
      new RegExp(pattern);
    } catch {
      return { code: "regexDoesNotCompile", value: pattern };
    }
    return undefined;
  }
  return match(spec.arity)
    .with("none", () => {
      return undefined;
    })
    .with("scalar", () => {
      const value = QueryFilterValue.getScalar(rule.value);
      return value === undefined
        ? undefined
        : _validateLiteral(value, rule.columnDataType);
    })
    .with("list", () => {
      return QueryFilterValue.getList({ value: rule.value }).reduce<
        QueryFilterValidationReason | undefined
      >((reason, item) => {
        return reason ?? _validateLiteral(item, rule.columnDataType);
      }, undefined);
    })
    .with("pair", () => {
      const pair = QueryFilterValue.getPair(rule.value);
      if (!pair) {
        return undefined;
      }
      const [lower, upper] = pair;
      const literalReason =
        _validateLiteral(lower, rule.columnDataType) ??
        _validateLiteral(upper, rule.columnDataType);
      if (literalReason) {
        return literalReason;
      }
      const comparable =
        rule.columnDataType !== undefined &&
        AvaDataType.isNumeric(rule.columnDataType)
          ? [Number(lower), Number(upper)]
          : [String(lower), String(upper)];
      return comparable[0]! > comparable[1]!
        ? ({ code: "betweenBoundsReversed" } as const)
        : undefined;
    })
    .exhaustive();
}

/**
 * Decides whether a filter rule can be applied, and says why when it cannot.
 */
export const QueryFilterValidation = {
  /**
   * True when the rule has everything the SQL layer needs. Do not render
   * incomplete rules: an empty value becomes `col = ''` / `col = NULL`.
   */
  isRuleComplete: _isRuleComplete,

  /**
   * Returns the reason a complete rule still cannot be applied, or `undefined`
   * when it is valid. Incomplete rules return `undefined`: they are excluded by
   * `isRuleComplete` and marked as unfinished rather than as invalid, so a
   * half-typed rule does not shout at the user.
   */
  validateRule: _validateRule,
};
