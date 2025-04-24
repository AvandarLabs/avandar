import {
  ActionIcon,
  Checkbox,
  Group,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { FormType } from "@/lib/hooks/ui/useForm";
import { ElementOf } from "@/lib/types/utilityTypes";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp, objectValues, sortBy } from "@/lib/utils/objects";
import { EntityFieldValueExtractorTypes } from "@/models/EntityConfig/EntityFieldConfig/constants";
import { EntityConfigForm } from "../types";

type Props = {
  entityConfigForm: FormType<EntityConfigForm>;
  defaultField: ElementOf<EntityConfigForm["fields"]>;
  idx: number;
  entityName: string;
};

const valueExtractorOptions = makeSelectOptions({
  list: sortBy({
    list: objectValues(EntityFieldValueExtractorTypes),
    valueFn: getProp("displayName"),
  }),
  valueFn: getProp("type"),
  labelFn: getProp("displayName"),
});

export function EntityFieldCreator({
  entityConfigForm,
  defaultField,
  idx,
  entityName,
}: Props): JSX.Element {
  const [valueExtractorType, setValueExtractorType] = useState(
    defaultField.valueExtractorType,
  );

  entityConfigForm.watch(`fields.${idx}.valueExtractorType`, ({ value }) => {
    setValueExtractorType(value);
  });

  return (
    <Stack>
      <Group>
        <TextInput
          key={entityConfigForm.key(`fields.${idx}.name`)}
          required
          label="Field Name"
          placeholder="Enter a name for the field"
          flex={1}
          {...entityConfigForm.getInputProps(`fields.${idx}.name`)}
        />
        <ActionIcon
          color="red"
          onClick={() => {
            return entityConfigForm.removeListItem("fields", idx);
          }}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
      <Group>
        <Checkbox
          key={entityConfigForm.key(`fields.${idx}.isIdField`)}
          label={`This is the ${entityName}'s ID`}
          {...entityConfigForm.getInputProps(`fields.${idx}.isIdField`, {
            type: "checkbox",
          })}
        />
        <Checkbox
          key={entityConfigForm.key(`fields.${idx}.isTitleField`)}
          label={`This is the ${entityName}'s title`}
          {...entityConfigForm.getInputProps(`fields.${idx}.isTitleField`, {
            type: "checkbox",
          })}
        />
        <Checkbox
          key={entityConfigForm.key(`fields.${idx}.allowManualEdit`)}
          label="Allow manual edit"
          {...entityConfigForm.getInputProps(`fields.${idx}.allowManualEdit`, {
            type: "checkbox",
          })}
        />
        <Checkbox
          key={entityConfigForm.key(`fields.${idx}.isArray`)}
          label="Allow multiple values"
          {...entityConfigForm.getInputProps(`fields.${idx}.isArray`, {
            type: "checkbox",
          })}
        />
      </Group>

      <Select
        key={entityConfigForm.key(`fields.${idx}.valueExtractorType`)}
        data={valueExtractorOptions}
        label="Where should the data for this field come from?"
        {...entityConfigForm.getInputProps(`fields.${idx}.valueExtractorType`)}
      />

      {valueExtractorType}
    </Stack>
  );
}
