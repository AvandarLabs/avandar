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
import { FormType } from "@/lib/hooks/ui/useForm";
import { EntityConfigId } from "@/models/EntityConfig/EntityConfig.types";
import {
  EntityConfigFormValues,
  makeDefaultManualEntryField,
} from "./entityConfigFormTypes";

type Props = {
  entityConfigForm: FormType<EntityConfigFormValues>;
  entityConfigId: EntityConfigId;
};

export function ManualEntryFieldsBlock({
  entityConfigForm,
  entityConfigId,
}: Props): JSX.Element {
  const { manualEntryFields } = entityConfigForm.getValues();

  const fieldRows = manualEntryFields.map((field, idx) => {
    const [fieldKeys, fieldInputProps] = entityConfigForm.keysAndProps(
      `manualEntryFields.${idx}`,
      ["name"],
    );

    const [fieldOptionsKeys, fieldOptionsInputProps] =
      entityConfigForm.keysAndProps(`manualEntryFields.${idx}.options`, [
        "allowManualEdit",
        "isArray",
      ]);

    return (
      <Stack key={field.id}>
        <Group>
          <TextInput
            key={fieldKeys.name}
            required
            label="Field Name"
            placeholder="Enter a name for the field"
            flex={1}
            {...fieldInputProps.name()}
            onChange={(e) => {
              // use the `replaceListItem` function so that the
              // `manualEntryFields` array gets reconstructed, so that we can
              // rebuild the Select options for the Title and ID field selects
              entityConfigForm.replaceListItem(`manualEntryFields`, idx, {
                ...field,
                name: e.currentTarget.value,
              });
            }}
          />
          <ActionIcon
            color="red"
            onClick={() => {
              return entityConfigForm.removeListItem("manualEntryFields", idx);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
        <Group>
          <Checkbox
            key={fieldOptionsKeys.allowManualEdit}
            label="Allow manual edit"
            {...fieldOptionsInputProps.allowManualEdit({ type: "checkbox" })}
          />
          <Checkbox
            key={fieldOptionsKeys.isArray}
            label="Allow multiple values"
            {...fieldOptionsInputProps.isArray({ type: "checkbox" })}
          />
        </Group>
      </Stack>
    );
  });

  return (
    <Fieldset legend="Fields to be manually entered">
      <Stack>
        {entityConfigForm.errors.fields ?
          <Text c="danger">{entityConfigForm.errors.fields}</Text>
        : <>
            {fieldRows.length === 0 ?
              <Text c="gray">No fields have been added</Text>
            : fieldRows}
          </>
        }

        <Button
          onClick={() => {
            entityConfigForm.insertListItem(
              "manualEntryFields",
              makeDefaultManualEntryField({
                entityConfigId,
                name: "New field",
              }),
            );
            entityConfigForm.clearFieldError("fields");
          }}
        >
          Add Field
        </Button>
      </Stack>
    </Fieldset>
  );
}
