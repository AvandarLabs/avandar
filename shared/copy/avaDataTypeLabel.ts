import { matchLiteral } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";

/**
 * The translated name of a column data type. Shared copy used wherever a
 * type is named to the user.
 *
 * `AvaDataType.toDisplayValue` is the untranslated counterpart, and is the
 * stable English identifier: interpolating it into a sentence leaves half the
 * sentence in English, and rendering it in a cell or a picker shows English in
 * every locale. Resolved at call time so it follows the active locale.
 */
export function avaDataTypeLabel(dataType: AvaDataType.T): string {
  return matchLiteral(dataType, {
    varchar: () => {
      return t`Text`;
    },
    bigint: () => {
      return t`Whole number`;
    },
    double: () => {
      return t`Decimal`;
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
