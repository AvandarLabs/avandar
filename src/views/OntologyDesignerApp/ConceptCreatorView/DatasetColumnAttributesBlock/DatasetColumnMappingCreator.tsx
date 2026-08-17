import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Checkbox, Fieldset, Select, Stack, Tooltip } from "@mantine/core";
import { DatasetColumnMappings } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore/index";
import type { ConceptFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import type { FormType } from "@avandar/ui/hooks";

type Props = {
  conceptForm: FormType<ConceptFormValues>;
  attributeIdx: number;
  attributeName: string;
};

/**
 * Returns the localized value-picker rule options for dataset column
 * mappings.
 */
function useValuePickerOptions(): ReadonlyArray<{
  value: string;
  label: string;
}> {
  const { t } = useLingui();
  return DatasetColumnMappings.ValuePickerTypes.map((ruleType) => {
    return {
      value: ruleType,
      label: matchLiteral(ruleType, {
        most_frequent: t`Choose the most frequent value`,
        first: t`Choose the first value we see`,
        sum: t`Get a sum of the values`,
        avg: t`Get an average of the values`,
        count: t`Get a count of how many values there are`,
        max: t`Choose the maximum value`,
        min: t`Choose the minimum value`,
      }),
    };
  });
}

export function DatasetColumnMappingCreator({
  conceptForm,
  attributeIdx,
  attributeName,
}: Props): JSX.Element {
  const { t } = useLingui();
  const valuePickerOptions = useValuePickerOptions();
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
