import {
  Button,
  Checkbox,
  Container,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { formRootRule, isNotEmpty } from "@mantine/form";
import { useLocalDatasets } from "@/components/DataManagerApp/queries";
import { useForm } from "@/lib/hooks/ui/useForm";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { makeDefaultEntityFieldDraft } from "@/models/EntityConfig/EntityFieldConfig/utils";
import { EntityConfig } from "@/models/EntityConfig/types";
import { EntityFieldCreatorBlock } from "./EntityFieldCreatorBlock";
import { EntityConfigForm } from "./types";

const initialFields = [
  makeDefaultEntityFieldDraft({
    isIdField: true,
    isTitleField: true,
    name: "Name",
  }),
];

export function EntityCreatorView(): JSX.Element {
  const [datasets] = useLocalDatasets();
  const datasetOptions = makeSelectOptions({
    list: datasets ?? [],
    valueFn: getProp("id"),
    labelFn: getProp("name"),
  });

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

          <Select
            key={entityConfigForm.key("datasetId")}
            data={datasetOptions}
            label="Dataset"
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
