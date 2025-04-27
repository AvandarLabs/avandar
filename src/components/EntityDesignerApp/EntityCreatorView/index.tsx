import { Button, Checkbox, Container, Stack, TextInput } from "@mantine/core";
import { formRootRule, isNotEmpty } from "@mantine/form";
import { LocalDatasetSelect } from "@/components/common/LocalDatasetSelect";
import { useForm } from "@/lib/hooks/ui/useForm";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityConfig } from "@/models/EntityConfig/types";
import {
  EntityConfigForm,
  makeDefaultEntityFieldDraft,
} from "./entityCreatorTypes";
import { EntityFieldCreatorBlock } from "./EntityFieldCreatorBlock";

const initialFields = [
  makeDefaultEntityFieldDraft({
    isIdField: true,
    isTitleField: true,
    name: "Name",
  }),
];

export function EntityCreatorView(): JSX.Element {
  const [doCreateEntityConfig, pendingEntityConfigCreate] =
    EntityConfigClient.withLogger().useInsert();

  const [entityConfigForm, entityConfigFormSetters] = useForm<EntityConfigForm>(
    {
      mode: "uncontrolled",
      initialValues: {
        name: "",
        description: "",
        datasetId: null,
        allowManualCreation: false,
        fields: initialFields,
      },
      validate: {
        fields: {
          [formRootRule]: isNotEmpty("At least one field is required"),
        },
      },
    },
  );

  return (
    <Container pt="lg">
      <form
        onSubmit={entityConfigForm.onSubmit(async (values) => {
          const entityConfig: EntityConfig<"Insert"> = {
            name: values.name,
            description: values.description,
            datasetId: values.datasetId,
            allowManualCreation: values.allowManualCreation,
          };

          doCreateEntityConfig({ data: entityConfig });
        })}
      >
        <Stack>
          <TextInput
            key={entityConfigForm.key("name")}
            required
            label="Entity Name"
            placeholder="Enter a name for the entity"
            {...entityConfigForm.getInputProps("name")}
          />
          <TextInput
            key={entityConfigForm.key("description")}
            label="Entity Description"
            placeholder="Enter a description for the entity"
            {...entityConfigForm.getInputProps("description")}
          />

          <LocalDatasetSelect
            key={entityConfigForm.key("datasetId")}
            {...entityConfigForm.getInputProps("datasetId")}
          />

          <Checkbox
            key={entityConfigForm.key("allowManualCreation")}
            label="Allow manual creation of new entities"
            {...entityConfigForm.getInputProps("allowManualCreation")}
          />

          <EntityFieldCreatorBlock
            entityConfigForm={entityConfigForm}
            formSetters={entityConfigFormSetters}
          />

          <Button type="submit" loading={pendingEntityConfigCreate}>
            Create
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
