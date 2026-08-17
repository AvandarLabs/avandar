import { t } from "@lingui/core/macro";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { match } from "ts-pattern";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/**
 * The user-visible label for a filter operator, worded for the column's type:
 * `>` reads "is after" on a date and "is greater than" on a number.
 *
 * Shared copy resolved at call time so it follows the active locale. The
 * exhaustive match means a new operator cannot ship without a label.
 */
export function queryFilterOperatorLabel(
  operator: QueryFilterOperator,
  dataType: AvaDataTypeNs.T | undefined,
): string {
  const isTemporal = dataType !== undefined && AvaDataType.isTemporal(dataType);
  return match(operator)
    .with("=", () => {
      return isTemporal ? t`is on` : t`is`;
    })
    .with("!=", () => {
      return isTemporal ? t`is not on` : t`is not`;
    })
    .with(">", () => {
      return isTemporal ? t`is after` : t`is greater than`;
    })
    .with(">=", () => {
      return isTemporal ? t`is on or after` : t`is at least`;
    })
    .with("<", () => {
      return isTemporal ? t`is before` : t`is less than`;
    })
    .with("<=", () => {
      return isTemporal ? t`is on or before` : t`is at most`;
    })
    .with("contains", () => {
      return t`contains`;
    })
    .with("not_contains", () => {
      return t`does not contain`;
    })
    .with("starts_with", () => {
      return t`starts with`;
    })
    .with("not_starts_with", () => {
      return t`does not start with`;
    })
    .with("ends_with", () => {
      return t`ends with`;
    })
    .with("not_ends_with", () => {
      return t`does not end with`;
    })
    .with("in", () => {
      return t`is any of`;
    })
    .with("not_in", () => {
      return t`is none of`;
    })
    .with("between", () => {
      return t`is between`;
    })
    .with("not_between", () => {
      return t`is not between`;
    })
    .with("is_null", () => {
      return t`has no value`;
    })
    .with("is_not_null", () => {
      return t`has a value`;
    })
    .with("is_blank", () => {
      return t`is blank`;
    })
    .with("is_not_blank", () => {
      return t`is not blank`;
    })
    .with("is_true", () => {
      return t`is true`;
    })
    .with("is_false", () => {
      return t`is false`;
    })
    .with("matches_regex", () => {
      return t`matches regex`;
    })
    .with("not_matches_regex", () => {
      return t`does not match regex`;
    })
    .with("like", () => {
      return t`matches pattern (legacy)`;
    })
    .with("not_like", () => {
      return t`does not match pattern (legacy)`;
    })
    .exhaustive();
}
