import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Checkbox, Fieldset, Select, Stack, Tooltip } from "@mantine/core";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore/index";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";

type Props = {
  conceptForm: FormType<ConceptFormValues>;
  attributeIdx: number;
  attributeName: string;
  /** The type of the dataset column this field reads. */
  columnDataType: AvaDataType.T;
};

/**
 * Returns the localized value-picker rule options the column's type allows.
 * On a text column `max` and `min` compare alphabetically, so their labels
 * say so instead of suggesting "10" beats "9".
 */
function useValuePickerOptions(columnDataType: AvaDataType.T): ReadonlyArray<{
  value: string;
  label: string;
}> {
  const { t } = useLingui();
  const isText = AvaDataType.isText(columnDataType);
  const maxLabel = isText
    ? t`Choose the value that comes last alphabetically`
    : t`Choose the maximum value`;
  const minLabel = isText
    ? t`Choose the value that comes first alphabetically`
    : t`Choose the minimum value`;
  return ValuePickerRule.getAllowedRuleTypes({ columnDataType }).map(
    (ruleType) => {
      return {
        value: ruleType,
        label: matchLiteral(ruleType, {
          most_frequent: t`Choose the most frequent value`,
          first: t`Choose the first value we see`,
          sum: t`Get a sum of the values`,
          avg: t`Get an average of the values`,
          count: t`Get a count of how many values there are`,
          max: maxLabel,
          min: minLabel,
        }),
      };
    },
  );
}

export function DatasetColumnMappingCreator({
  conceptForm,
  attributeIdx,
  attributeName,
  columnDataType,
}: Props): JSX.Element {
  const { t } = useLingui();
  const valuePickerOptions = useValuePickerOptions(columnDataType);
  const [state] = ConceptCreatorStore.useContext();
  const [attributeKeys, attributeInputProps] = conceptForm.keysAndProps(
    `datasetColumnAttributes.${attributeIdx}`,
    ["isArray", "allowManualEdit"],
  );

  const [mappingKeys, mappingInputProps] = conceptForm.keysAndProps(
    `datasetColumnAttributes.${attributeIdx}.mappings.datasetColumn`,
    ["valuePickerRuleType"],
  );

  // Check whether "only allow one" is enabled
  const isArray =
    conceptForm.getValues().datasetColumnAttributes[attributeIdx]?.isArray ??
    true;
  const onlyAllowOneValue = !isArray;

  return (
    <Fieldset legend={attributeName}>
      <Stack>
        <Checkbox
          key={attributeKeys.allowManualEdit}
          label={t`Allow manual edit`}
          {...attributeInputProps.allowManualEdit({ type: "checkbox" })}
        />
        <Tooltip
          label={t`If each ${state.singularConceptName} can only have one ${attributeName} value, check this box.`}
          refProp="rootRef"
        >
          <Checkbox
            key={attributeKeys.isArray}
            label={t`Only allow one value`}
            checked={onlyAllowOneValue}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              // Invert logic: checked means isArray = false
              conceptForm.setFieldValue(
                `datasetColumnAttributes.${attributeIdx}.isArray`,
                !checked,
              );
            }}
          />
        </Tooltip>

        {onlyAllowOneValue && (
          <Select
            key={mappingKeys.valuePickerRuleType}
            data={valuePickerOptions}
            label={t`If there are multiple ${attributeName} values for one ${state.singularConceptName}, then...`}
            placeholder={t`Select rule (e.g. most frequent)`}
            {...mappingInputProps.valuePickerRuleType()}
          />
        )}
      </Stack>
    </Fieldset>
  );
}
