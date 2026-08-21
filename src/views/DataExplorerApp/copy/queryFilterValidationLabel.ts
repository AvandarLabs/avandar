import { t } from "@lingui/core/macro";
import { match } from "ts-pattern";
import { avaDataTypeLabel } from "@/views/DataExplorerApp/copy/avaDataTypeLabel";
import type { QueryFilterValidationReason } from "$/models/queries/StructuredQuery/QueryFilterValidation/QueryFilterValidation";

/**
 * The sentence shown under a filter rule that cannot be applied.
 *
 * `QueryFilterValidation` runs in shared code with no access to the active
 * locale, so it reports structured codes and this turns them into text.
 */
export function queryFilterValidationLabel(
  reason: QueryFilterValidationReason,
): string {
  return match(reason)
    .with({ code: "unknownOperator" }, ({ operator }) => {
      return t`"${operator}" is not an operator this form understands.`;
    })
    .with({ code: "operatorNotAllowedForType" }, ({ dataType }) => {
      const typeName = avaDataTypeLabel(dataType);
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
