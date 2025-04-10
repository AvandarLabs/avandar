import {
  ActionIcon,
  Button,
  Container,
  Fieldset,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { formRootRule, isNotEmpty, useForm } from "@mantine/form";
import { IconTrash } from "@tabler/icons-react";
import { Logger } from "@/lib/Logger";
import { getProp } from "@/lib/utils/objects";
import { uuid } from "@/lib/utils/uuid";
import { EntityConfig, EntityConfigId } from "@/models/EntityConfig";
import { EntityFieldConfigId } from "@/models/EntityFieldConfig";

type EntityConfigForm = {
  id: EntityConfigId;
  name: string;
  description: string;
  fields: Array<{ id: EntityFieldConfigId; name: string }>;
  titleField?: EntityFieldConfigId;
  idField?: EntityFieldConfigId;
};

export function EntityCreator(): JSX.Element {
  const configForm = useForm<EntityConfigForm>({
    mode: "uncontrolled",
    initialValues: {
      id: uuid(),
      name: "",
      description: "",
      fields: [],
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
  });

  const fieldRows = configForm.getValues().fields.map((field, idx) => {
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

          const entityConfig: EntityConfig = {
            id: values.id,
            name: values.name,
            description: values.description,
            fields: values.fields.map(getProp("id")),
            titleField: values.titleField,
            idField: values.idField,
          };

          Logger.log(entityConfig);
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
                  configForm.insertListItem("fields", {
                    id: uuid(),
                    name: "",
                  });
                  configForm.clearFieldError("fields");
                }}
              >
                Add Field
              </Button>
            </Stack>
          </Fieldset>

          <TextInput
            required
            key={configForm.key("titleField")}
            label="Title field"
            placeholder="Enter the field name that will be used as the label"
            {...configForm.getInputProps("titleField")}
          />
          <TextInput
            required
            key={configForm.key("idField")}
            label="ID field"
            placeholder="Enter the field name that will be used as the ID"
            {...configForm.getInputProps("idField")}
          />
          <Button type="submit">Create</Button>
        </Stack>
      </form>
    </Container>
  );
}
