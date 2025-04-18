import {
  ActionIcon,
  Button,
  ComboboxItem,
  Container,
  Fieldset,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "@/lib/hooks/ui/useForm";
import { Logger } from "@/lib/Logger";
import { areArrayContentsEqual } from "@/lib/utils/arrays";
import { getProp } from "@/lib/utils/objects";
import { makeSelectOptions } from "@/lib/utils/ui/makeSelectOptions";
import { uuid } from "@/lib/utils/uuid";
import { EntityConfig } from "@/models/EntityConfig/EntityConfig";
import { EntityFieldConfig } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfig";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import { makeEntityFieldConfig } from "@/models/EntityConfig/EntityFieldConfig/entityFieldConfigUtils";

type EntityConfigForm = {
  name: string;
  description: string;

  // TODO(pablo): implement this
  fields: EntityFieldConfig[];
};

function fieldsToSelectOptions(fields: EntityFieldConfig[]): ComboboxItem[] {
  return makeSelectOptions({
    inputList: fields,
    valueFn: getProp("id"),
    labelFn: (field) => {
      return field.name || "[Unnamed field]";
    },
  });
}

const initialFields = [makeEntityFieldConfig({ id: uuid(), name: "" })];
const initialFieldOptions = fieldsToSelectOptions(initialFields);

export function EntityCreatorView(): JSX.Element {
  const [entityFields] = EntityFieldConfigClient.useGetAll();
  Logger.log("entity fields", entityFields);

  const [configForm, setConfigForm] = useForm<EntityConfigForm>({
    mode: "uncontrolled",
    initialValues: {
      name: "",
      description: "",
      fields: initialFields,
    },
    validate: {
      fields: {
        // TODO(pablo): enable this rule again
        // [formRootRule]: isNotEmpty("At least one field is required"),
      },
    },
    onValuesChange: (newValues, prevValues) => {
      // to generate new field options we only care if the names and ids of the
      // fields have changed
      const areFieldsChanged = !areArrayContentsEqual(
        newValues.fields,
        prevValues.fields,
        (field) => {
          return `id=${field.id}&name=${field.name}`;
        },
      );

      if (areFieldsChanged) {
        setFieldOptions(fieldsToSelectOptions(newValues.fields));
      }
    },
  });
  const [fieldOptions, setFieldOptions] =
    useState<ComboboxItem[]>(initialFieldOptions);

  const { fields } = configForm.getValues();
  const fieldRows = fields.map((field, idx) => {
    return (
      <Group key={field.id}>
        <TextInput
          key={configForm.key(`fields.${idx}.name`)}
          required
          label="Field Name"
          placeholder="Enter a name for the field"
          {...configForm.getInputProps(`fields.${idx}.name`)}
        />
        <ActionIcon
          color="red"
          onClick={() => {
            return configForm.removeListItem("fields", idx);
          }}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    );
  });

  return (
    <Container pt="lg">
      <form
        onSubmit={configForm.onSubmit((values) => {
          Logger.log("submitted values", values);

          const entityConfig: EntityConfig<"Insert"> = {
            name: values.name,
            description: values.description,
          };

          Logger.log("final config", entityConfig);
        })}
      >
        <Stack>
          <TextInput
            key={configForm.key("name")}
            required
            label="Entity Name (should be a combo box)"
            placeholder="Enter a name for the entity"
            {...configForm.getInputProps("name")}
          />
          <TextInput
            key={configForm.key("description")}
            label="Entity Description"
            placeholder="Enter a description for the entity"
            {...configForm.getInputProps("description")}
          />

          <Fieldset legend="Fields">
            <Stack>
              {configForm.errors.fields ?
                <Text c="danger">{configForm.errors.fields}</Text>
              : <>{fieldRows}</>}
              <Button
                onClick={() => {
                  setConfigForm.insertListItem(
                    "fields",
                    makeEntityFieldConfig({
                      id: uuid(),
                      name: "",
                    }),
                  );
                  configForm.clearFieldError("fields");
                }}
              >
                Add Field
              </Button>
            </Stack>
          </Fieldset>
          <Button type="submit">Create</Button>
        </Stack>
      </form>
    </Container>
  );
}
