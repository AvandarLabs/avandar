import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { DatasetColumnMappings } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";

/**
 * Short localized value-picker labels for the draft card, offering only the
 * rules the column's type allows. The concept creator form uses full
 * sentences, which do not fit the chat panel's narrow rows.
 *
 * Until the column's type is known every rule is offered: the edge function
 * already held the model's rule to the same catalog, and creation checks it
 * again.
 *
 * On a text column `max` and `min` compare alphabetically, ignoring case and
 * accents. They are named for that rather than "Max" and "Min", which would
 * suggest "10" beats "9".
 */
export function useValuePickerOptions(
  columnDataType: AvaDataType.T | undefined,
): ReadonlyArray<{ value: ValuePickerRule.T; label: string }> {
  const { t } = useLingui();
  const isText = columnDataType ? AvaDataType.isText(columnDataType) : false;
  const maxLabel = isText ? t`Alphabetically last` : t`Max`;
  const minLabel = isText ? t`Alphabetically first` : t`Min`;
  const ruleTypes = columnDataType
    ? ValuePickerRule.getAllowedRuleTypes({ columnDataType })
    : DatasetColumnMappings.ValuePickerTypes;
  return ruleTypes.map((ruleType) => {
    return {
      value: ruleType,
      label: matchLiteral(ruleType, {
        most_frequent: t`Most frequent`,
        first: t`First`,
        sum: t`Sum`,
        avg: t`Average`,
        count: t`Count`,
        max: maxLabel,
        min: minLabel,
      }),
    };
  });
}
