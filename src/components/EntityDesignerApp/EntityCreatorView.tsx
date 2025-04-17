import {
  ActionIcon,
  Button,
  ComboboxItem,
  Container,
  Fieldset,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { formRootRule, isNotEmpty } from "@mantine/form";
import { User } from "@supabase/supabase-js";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "@/lib/hooks/ui/useForm";
import { Logger } from "@/lib/Logger";
import { areArrayContentsEqual } from "@/lib/utils/arrays";
import { getProp } from "@/lib/utils/objects";
import { makeSelectOptions } from "@/lib/utils/ui/makeSelectOptions";
import { uuid } from "@/lib/utils/uuid";
import {
  EntityConfig,
  EntityConfigId,
} from "@/models/EntityConfig/EntityConfig";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
  makeEntityFieldConfig,
} from "@/models/EntityFieldConfig";
import { UserId } from "@/models/User";

type EntityConfigForm = {
  id: EntityConfigId;
  ownerId: UserId;
  name: string;
  description: string;
  fields: EntityFieldConfig[];
  titleField?: EntityFieldConfigId;
  idField?: EntityFieldConfigId;
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

export function EntityCreator({
  currentUser,
}: {
  currentUser: User;
}): JSX.Element {
  const [configForm, setConfigForm] = useForm<EntityConfigForm>({
    mode: "uncontrolled",
    initialValues: {
      id: uuid(),
      ownerId: uuid(currentUser.id),
      name: "",
      description: "",
      fields: initialFields,
      titleField: undefined,
      idField: undefined,
    },
    validate: {
      fields: {
        [formRootRule]: isNotEmpty("At least one field is required"),
      },
      titleField: isNotEmpty("Title field is required"),
      idField: isNotEmpty("ID field is required"),
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
          if (!values.titleField || !values.idField) {
            // no need to raise any error, this should have been
            // caught by form validation
            return;
          }

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

          <Select
            required
            key={configForm.key("titleField")}
            label="Title field"
            placeholder="Enter the field to use as the label"
            data={fieldOptions}
            {...configForm.getInputProps("titleField")}
          />

          <Select
            required
            key={configForm.key("idField")}
            label="ID field"
            placeholder="Enter the field that can uniquely identify this entity"
            data={fieldOptions}
            {...configForm.getInputProps("idField")}
          />
          <Button type="submit">Create</Button>
        </Stack>
      </form>
    </Container>
  );
}
