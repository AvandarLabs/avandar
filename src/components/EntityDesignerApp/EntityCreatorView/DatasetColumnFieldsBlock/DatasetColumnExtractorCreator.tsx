import { Checkbox, Fieldset, Group, Select } from "@mantine/core";
import { FormType } from "@/lib/hooks/ui/useForm";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectValues } from "@/lib/utils/objects/misc";
import { ValuePickerRuleTypes } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/constants";
import { EntityConfigFormValues } from "../entityConfigFormTypes";

type Props = {
  entityConfigForm: FormType<EntityConfigFormValues>;
  fieldIdx: number;
  fieldName: string;
};

const valuePickerOptions = makeSelectOptions(
  objectValues(ValuePickerRuleTypes),
  {
    valueFn: getProp("type"),
    labelFn: getProp("displayName"),
  },
);

export function DatasetColumnExtractorCreator({
  entityConfigForm,
  fieldIdx,
  fieldName,
}: Props): JSX.Element {
  const [fieldOptionsKeys, fieldOptionsInputProps] =
    entityConfigForm.keysAndProps(`datasetColumnFields.${fieldIdx}.options`, [
      "isArray",
      "allowManualEdit",
    ]);

  const [extractorKeys, extractorInputProps] = entityConfigForm.keysAndProps(
    `datasetColumnFields.${fieldIdx}.extractors.datasetColumnValue`,
    ["valuePickerRuleType"],
  );

  // Check whether "only allow one" is enabled
  const isArray =
    entityConfigForm.getValues().datasetColumnFields[fieldIdx]?.options
      ?.isArray ?? true;
  const onlyAllowOneValue = !isArray;

  return (
    <Fieldset legend={fieldName}>
      <Group>
        <Checkbox
          key={fieldOptionsKeys.allowManualEdit}
          label="Allow manual edit"
          {...fieldOptionsInputProps.allowManualEdit({ type: "checkbox" })}
        />
        <Checkbox
          key={fieldOptionsKeys.isArray}
          label="Only allow one value"
          checked={onlyAllowOneValue}
          onChange={(e) => {
            const checked = e.currentTarget.checked;
            // Invert logic: checked means isArray = false
            entityConfigForm.setFieldValue(
              `datasetColumnFields.${fieldIdx}.options.isArray`,
              !checked,
            );
          }}
        />
      </Group>

      {onlyAllowOneValue && (
        <Select
          key={extractorKeys.valuePickerRuleType}
          data={valuePickerOptions}
          label="Value picker rule"
          placeholder="Select rule (e.g. most frequent)"
          {...extractorInputProps.valuePickerRuleType()}
        />
      )}
    </Fieldset>
  );
}
