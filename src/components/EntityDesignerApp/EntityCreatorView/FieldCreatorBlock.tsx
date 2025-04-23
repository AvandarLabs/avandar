import {
  ActionIcon,
  Button,
  Checkbox,
  Fieldset,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { FormSetters, FormType } from "@/lib/hooks/ui/useForm";
import { CollapsibleItem } from "@/lib/ui/EntityDescriptionList/CollapsibleItem";
import { makeDefaultEntityFieldDraft } from "@/models/EntityConfig/EntityFieldConfig/utils";
import { EntityConfigForm } from "./types";

type Props = {
  entityConfigForm: FormType<EntityConfigForm>;
  formSetters: FormSetters<EntityConfigForm>;
};

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
        <CollapsibleItem label="Value extractor block">
          woah more items
        </CollapsibleItem>
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
