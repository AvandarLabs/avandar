import { matchLiteral } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

/**
 * The translated name of a column data type, for copy that names a type to the
 * user.
 *
 * `AvaDataType.toDisplayValue` is the untranslated counterpart: it returns bare
 * English identifiers, so interpolating it into a translated sentence leaves
 * half the sentence in English.
 */
export function avaDataTypeLabel(dataType: AvaDataType.T): string {
  return matchLiteral(dataType, {
    varchar: () => {
      return t`Text`;
    },
    bigint: () => {
      return t`Integer`;
    },
    double: () => {
      return t`Number`;
    },
    time: () => {
      return t`Time`;
    },
    date: () => {
      return t`Date`;
    },
    timestamp: () => {
      return t`Timestamp`;
    },
    boolean: () => {
      return t`Boolean`;
    },
  });
}
