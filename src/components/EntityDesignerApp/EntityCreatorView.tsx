import {
  ActionIcon,
  Button,
  Container,
  Fieldset,
  Group,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconTrash } from "@tabler/icons-react";
import { Logger } from "@/lib/Logger";
import { uuid } from "@/lib/utils/uuid";
import { EntityConfigId } from "@/models/EntityConfig";

type EntityConfigForm = {
  id: EntityConfigId;
  name: string;
  description: string;
  fields: ReadonlyArray<{ id: string; name: string }>;
  titleField: string;
  idField: string;
};

export function EntityCreator(): JSX.Element {
  const configForm = useForm<EntityConfigForm>({
    mode: "uncontrolled",
    initialValues: {
      id: uuid(),
      name: "",
      description: "",
      fields: [],
      titleField: "",
      idField: "",
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
          Logger.log(values);
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
              {fieldRows}
              <Button
                onClick={() => {
                  return configForm.insertListItem("fields", {
                    id: uuid(),
                    name: "",
                  });
                }}
              >
                Add Field
              </Button>
            </Stack>
          </Fieldset>

          <TextInput
            key={configForm.key("titleField")}
            label="Title field"
            placeholder="Enter the field name that will be used as the label"
            {...configForm.getInputProps("titleField")}
          />
          <TextInput
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
