import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { operatorSpec } from "$/models/queries/StructuredQuery/QueryFilterOperator.ts";
import {
  filterValueAsList,
  filterValueAsPair,
  filterValueAsScalar,
} from "$/models/queries/StructuredQuery/QueryFilterValue.ts";
import { match } from "ts-pattern";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type {
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/**
 * Why a rule cannot be applied. Structured codes rather than sentences: this
 * runs in shared code with no access to the active locale, so
 * `queryFilterValidationLabel` renders them.
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

/**
 * True when the rule has everything the SQL layer needs. Incomplete rules are
 * excluded from the query rather than run with an empty value, which is what
 * used to produce `col = ''` and `col = NULL` predicates.
 */
export function isFilterRuleComplete(rule: QueryFilterRule): boolean {
  if (rule.columnName.trim() === "") {
    return false;
  }
  const spec = operatorSpec(rule.operator);
  if (!spec) {
    return false;
  }
  return match(spec.arity)
    .with("none", () => {
      return true;
    })
    .with("scalar", () => {
      return filterValueAsScalar(rule.value) !== undefined;
    })
    .with("list", () => {
      return filterValueAsList(rule.value).length > 0;
    })
    .with("pair", () => {
      return filterValueAsPair(rule.value) !== undefined;
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
  if (dataType === undefined) {
    return undefined;
  }
  if (AvaDataType.isNumeric(dataType) && !_isNumericText(value)) {
    return { code: "valueNotANumber", value: String(value) };
  }
  if (AvaDataType.isTemporal(dataType) && !_isDateText(value)) {
    return { code: "valueNotADate", value: String(value) };
  }
  return undefined;
}

/**
 * Returns the reason a complete rule still cannot be applied, or `undefined`
 * when it is valid. Incomplete rules return `undefined`: they are excluded by
 * `isFilterRuleComplete` and marked as unfinished rather than as invalid, so a
 * half-typed rule does not shout at the user.
 */
export function validateFilterRule(
  rule: QueryFilterRule,
): QueryFilterValidationReason | undefined {
  const spec = operatorSpec(rule.operator);
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
  if (!isFilterRuleComplete(rule)) {
    return undefined;
  }
  if (
    rule.operator === "matches_regex" ||
    rule.operator === "not_matches_regex"
  ) {
    const pattern = String(filterValueAsScalar(rule.value));
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
      const value = filterValueAsScalar(rule.value);
      return value === undefined ? undefined : (
          _validateLiteral(value, rule.columnDataType)
        );
    })
    .with("list", () => {
      return filterValueAsList(rule.value).reduce<
        QueryFilterValidationReason | undefined
      >((reason, item) => {
        return reason ?? _validateLiteral(item, rule.columnDataType);
      }, undefined);
    })
    .with("pair", () => {
      const pair = filterValueAsPair(rule.value);
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
        (
          rule.columnDataType !== undefined &&
          AvaDataType.isNumeric(rule.columnDataType)
        ) ?
          [Number(lower), Number(upper)]
        : [String(lower), String(upper)];
      return comparable[0]! > comparable[1]! ?
          ({ code: "betweenBoundsReversed" } as const)
        : undefined;
    })
    .exhaustive();
}
