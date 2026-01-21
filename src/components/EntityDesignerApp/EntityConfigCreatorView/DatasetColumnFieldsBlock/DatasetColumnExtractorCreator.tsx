import { Checkbox, Fieldset, Select, Stack, Tooltip } from "@mantine/core";
import { FormType } from "@/lib/hooks/ui/useForm";
import { matchLiteral } from "@/lib/utils/strings/matchLiteral";
import { DatasetColumnValueExtractors } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractors";
import { EntityConfigCreatorStore } from "../EntityConfigCreatorStore";
import { EntityConfigFormValues } from "../entityConfigFormTypes";

type Props = {
  entityConfigForm: FormType<EntityConfigFormValues>;
  fieldIdx: number;
  fieldName: string;
};

const valuePickerOptions = DatasetColumnValueExtractors.ValuePickerTypes.map(
  (ruleType) => {
    return {
      value: ruleType,
      label: matchLiteral(ruleType, {
        most_frequent: "Choose the most frequent value",
        first: "Choose the first value we see",
        sum: "Get a sum of the values",
        avg: "Get an average of the values",
        count: "Get a count of how many values there are",
        max: "Choose the maximum value",
        min: "Choose the minimum value",
      }),
    };
  },
);

export function DatasetColumnExtractorCreator({
  entityConfigForm,
  fieldIdx,
  fieldName,
}: Props): JSX.Element {
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
          label="Allow manual edit"
          {...fieldInputProps.allowManualEdit({ type: "checkbox" })}
        />
        <Tooltip
          label={`If each ${state.singularEntityConfigName} can only have one ${fieldName} value, check this box.`}
          refProp="rootRef"
        >
          <Checkbox
            key={fieldKeys.isArray}
            label="Only allow one value"
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
            label={`If there are multiple ${fieldName} values for one ${state.singularEntityConfigName}, then...`}
            placeholder="Select rule (e.g. most frequent)"
            {...extractorInputProps.valuePickerRuleType()}
          />
        )}
      </Stack>
    </Fieldset>
  );
}
