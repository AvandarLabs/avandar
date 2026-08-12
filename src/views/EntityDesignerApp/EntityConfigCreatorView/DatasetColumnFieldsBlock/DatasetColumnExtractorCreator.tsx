import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Checkbox, Fieldset, Select, Stack, Tooltip } from "@mantine/core";
import { DatasetColumnValueExtractors } from "$/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractors";
import { EntityConfigCreatorStore } from "@/views/EntityDesignerApp/EntityConfigCreatorView/EntityConfigCreatorStore/index";
import type { EntityConfigFormValues } from "@/views/EntityDesignerApp/EntityConfigCreatorView/entityConfigFormTypes";
import type { FormType } from "@avandar/ui/hooks";

type Props = {
  entityConfigForm: FormType<EntityConfigFormValues>;
  fieldIdx: number;
  fieldName: string;
};

/**
 * Returns the localized value-picker rule options for dataset column
 * extractors.
 */
function useValuePickerOptions(): ReadonlyArray<{
  value: string;
  label: string;
}> {
  const { t } = useLingui();
  return DatasetColumnValueExtractors.ValuePickerTypes.map((ruleType) => {
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

export function DatasetColumnExtractorCreator({
  entityConfigForm,
  fieldIdx,
  fieldName,
}: Props): JSX.Element {
  const { t } = useLingui();
  const valuePickerOptions = useValuePickerOptions();
  const [state] = EntityConfigCreatorStore.useContext();
  const [fieldKeys, fieldInputProps] = entityConfigForm.keysAndProps(
    `datasetColumnFields.${fieldIdx}`,
    ["isArray", "allowManualEdit"],
  );

  const [extractorKeys, extractorInputProps] = entityConfigForm.keysAndProps(
    `datasetColumnFields.${fieldIdx}.extractors.datasetColumnValue`,
    ["valuePickerRuleType"],
  );

  // Check whether "only allow one" is enabled
  const isArray =
    entityConfigForm.getValues().datasetColumnFields[fieldIdx]?.isArray ?? true;
  const onlyAllowOneValue = !isArray;

  return (
    <Fieldset legend={fieldName}>
      <Stack>
        <Checkbox
          key={fieldKeys.allowManualEdit}
          label={t`Allow manual edit`}
          {...fieldInputProps.allowManualEdit({ type: "checkbox" })}
        />
        <Tooltip
          label={t`If each ${state.singularEntityConfigName} can only have one ${fieldName} value, check this box.`}
          refProp="rootRef"
        >
          <Checkbox
            key={fieldKeys.isArray}
            label={t`Only allow one value`}
            checked={onlyAllowOneValue}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              // Invert logic: checked means isArray = false
              entityConfigForm.setFieldValue(
                `datasetColumnFields.${fieldIdx}.isArray`,
                !checked,
              );
            }}
          />
        </Tooltip>

        {onlyAllowOneValue && (
          <Select
            key={extractorKeys.valuePickerRuleType}
            data={valuePickerOptions}
            label={t`If there are multiple ${fieldName} values for one ${state.singularEntityConfigName}, then...`}
            placeholder={t`Select rule (e.g. most frequent)`}
            {...extractorInputProps.valuePickerRuleType()}
          />
        )}
      </Stack>
    </Fieldset>
  );
}
