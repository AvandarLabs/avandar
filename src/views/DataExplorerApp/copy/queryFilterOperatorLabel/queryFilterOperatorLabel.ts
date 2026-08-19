import { matchLiteral } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator";

/**
 * The label the operator dropdown shows for one filter operator.
 *
 * Comparison operators read differently on a date than on a number ("is on"
 * versus "is", "is at least" versus "is on or after"), so the column's type
 * picks the wording. Legacy operators are labelled as such: they are still
 * rendered for saved queries but are never offered for a new rule.
 */
export function queryFilterOperatorLabel(
  options: Readonly<{
    operator: QueryFilterOperator;
    dataType: AvaDataTypeNs.T | undefined;
  }>,
): string {
  const { operator, dataType } = options;
  const isTemporal = dataType !== undefined && AvaDataType.isTemporal(dataType);
  return matchLiteral(operator, {
    "=": () => {
      return isTemporal ? t`is on` : t`is`;
    },
    "!=": () => {
      return isTemporal ? t`is not on` : t`is not`;
    },
    ">": () => {
      return isTemporal ? t`is after` : t`is greater than`;
    },
    ">=": () => {
      return isTemporal ? t`is on or after` : t`is at least`;
    },
    "<": () => {
      return isTemporal ? t`is before` : t`is less than`;
    },
    "<=": () => {
      return isTemporal ? t`is on or before` : t`is at most`;
    },
    contains: () => {
      return t`contains`;
    },
    not_contains: () => {
      return t`does not contain`;
    },
    starts_with: () => {
      return t`starts with`;
    },
    not_starts_with: () => {
      return t`does not start with`;
    },
    ends_with: () => {
      return t`ends with`;
    },
    not_ends_with: () => {
      return t`does not end with`;
    },
    in: () => {
      return t`is any of`;
    },
    not_in: () => {
      return t`is none of`;
    },
    between: () => {
      return t`is between`;
    },
    not_between: () => {
      return t`is not between`;
    },
    is_null: () => {
      return t`has no value`;
    },
    is_not_null: () => {
      return t`has a value`;
    },
    is_blank: () => {
      return t`is blank`;
    },
    is_not_blank: () => {
      return t`is not blank`;
    },
    is_true: () => {
      return t`is true`;
    },
    is_false: () => {
      return t`is false`;
    },
    matches_regex: () => {
      return t`matches regex`;
    },
    not_matches_regex: () => {
      return t`does not match regex`;
    },
    like: () => {
      return t`matches pattern (legacy)`;
    },
    not_like: () => {
      return t`does not match pattern (legacy)`;
    },
  });
}
