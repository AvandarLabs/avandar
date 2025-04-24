import {
  ActionIcon,
  Button,
  Checkbox,
  Fieldset,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { FormSetters, FormType } from "@/lib/hooks/ui/useForm";
import { makeSelectOptions } from "@/lib/ui/Select/makeSelectOptions";
import { getProp, objectValues, sortBy } from "@/lib/utils/objects";
import { EntityFieldValueExtractorTypes } from "@/models/EntityConfig/EntityFieldConfig/constants";
import { makeDefaultEntityFieldDraft } from "@/models/EntityConfig/EntityFieldConfig/utils";
import { EntityConfigForm } from "./types";

type Props = {
  entityConfigForm: FormType<EntityConfigForm>;
  formSetters: FormSetters<EntityConfigForm>;
};

const valueExtractorOptions = makeSelectOptions({
  inputList: sortBy({
    list: objectValues(EntityFieldValueExtractorTypes),
    valueFn: getProp("displayName"),
  }),
  valueFn: getProp("type"),
  labelFn: getProp("displayName"),
});

export function FieldCreatorBlock({
  entityConfigForm,
  formSetters,
}: Props): JSX.Element {
  const { name, fields } = entityConfigForm.getValues();
  const entityName = name || "Entity";

  const fieldRows = fields.map((field, idx) => {
    return (
      <Group key={field.draftId}>
        <TextInput
          key={entityConfigForm.key(`fields.${idx}.name`)}
          required
          label="Field Name"
          placeholder="Enter a name for the field"
          {...entityConfigForm.getInputProps(`fields.${idx}.name`)}
        />
        <Checkbox
          key={entityConfigForm.key(`fields.${idx}.isIdField`)}
          label={`This is the the ${entityName}'s ID`}
          {...entityConfigForm.getInputProps(`fields.${idx}.isIdField`, {
            type: "checkbox",
          })}
        />
        <Checkbox
          key={entityConfigForm.key(`fields.${idx}.isTitleField`)}
          label={`This is the the ${entityName}'s title`}
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
        <ActionIcon
          color="red"
          onClick={() => {
            return entityConfigForm.removeListItem("fields", idx);
          }}
        >
          <IconTrash size={16} />
        </ActionIcon>
        <Select
          data={valueExtractorOptions}
          label="Where should the data for this field come from?"
          {...entityConfigForm.getInputProps(
            `fields.${idx}.valueExtractorType`,
          )}
        />
      </Group>
    );
  });

  return (
    <Fieldset legend="Fields">
      <Stack>
        {entityConfigForm.errors.fields ?
          <Text c="danger">{entityConfigForm.errors.fields}</Text>
        : <>{fieldRows}</>}
        <Button
          onClick={() => {
            formSetters.insertListItem("fields", makeDefaultEntityFieldDraft());
            entityConfigForm.clearFieldError("fields");
          }}
        >
          Add Field
        </Button>
      </Stack>
    </Fieldset>
  );
}
