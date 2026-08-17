import { t } from "@lingui/core/macro";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { match } from "ts-pattern";
import type { QueryFilterValidationReason } from "$/models/queries/StructuredQuery/QueryFilterValidation.ts";

/**
 * The message shown under a filter rule that cannot be applied.
 *
 * Shared copy resolved at call time so it follows the active locale.
 */
export function queryFilterValidationLabel(
  reason: QueryFilterValidationReason,
): string {
  return match(reason)
    .with({ code: "unknownOperator" }, ({ operator }) => {
      return t`"${operator}" is not an operator this form understands.`;
    })
    .with({ code: "operatorNotAllowedForType" }, ({ dataType }) => {
      const typeName = AvaDataType.toDisplayValue(dataType);
      return t`This condition does not apply to ${typeName} columns.`;
    })
    .with({ code: "valueNotANumber" }, ({ value }) => {
      return t`"${value}" is not a number.`;
    })
    .with({ code: "valueNotADate" }, ({ value }) => {
      return t`"${value}" is not a date. Use YYYY-MM-DD.`;
    })
    .with({ code: "betweenBoundsReversed" }, () => {
      return t`The first value must not be greater than the second.`;
    })
    .with({ code: "regexDoesNotCompile" }, ({ value }) => {
      return t`"${value}" is not a valid regular expression.`;
    })
    .exhaustive();
}
