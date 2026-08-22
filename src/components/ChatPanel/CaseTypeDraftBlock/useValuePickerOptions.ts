import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";

import { DatasetColumnMappings } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings";

/**
 * Short localized value-picker labels for the draft card. The concept creator
 * form uses full sentences, which do not fit the chat panel's narrow rows.
 */
export function useValuePickerOptions(): ReadonlyArray<{
  value: string;
  label: string;
}> {
  const { t } = useLingui();
  return DatasetColumnMappings.ValuePickerTypes.map((ruleType) => {
    return {
      value: ruleType,
      label: matchLiteral(ruleType, {
        most_frequent: t`Most frequent`,
        first: t`First`,
        sum: t`Sum`,
        avg: t`Average`,
        count: t`Count`,
        max: t`Max`,
        min: t`Min`,
      }),
    };
  });
}
