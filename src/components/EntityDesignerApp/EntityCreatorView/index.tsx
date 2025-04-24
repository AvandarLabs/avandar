import {
  Button,
  Checkbox,
  Container,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { formRootRule, isNotEmpty } from "@mantine/form";
import { useState } from "react";
import { useLocalDatasets } from "@/components/DataManagerApp/queries";
import { useForm } from "@/lib/hooks/ui/useForm";
import { SelectOption } from "@/lib/ui/Select";
import { makeSelectOptions } from "@/lib/ui/Select/makeSelectOptions";
import { areArrayContentsEqual } from "@/lib/utils/arrays";
import { getProp } from "@/lib/utils/objects";
import { pipe } from "@/lib/utils/pipe";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import {
  DraftFieldId,
  EntityFieldConfig,
} from "@/models/EntityConfig/EntityFieldConfig/types";
import { makeDefaultEntityFieldDraft } from "@/models/EntityConfig/EntityFieldConfig/utils";
import { EntityConfig } from "@/models/EntityConfig/types";
import { FieldCreatorBlock } from "./FieldCreatorBlock";
import { EntityConfigForm } from "./types";

function fieldsToSelectOptions(
  fields: Array<EntityFieldConfig<"Draft">>,
): Array<SelectOption<DraftFieldId>> {
  return makeSelectOptions({
    list: fields,
    valueFn: getProp("draftId"),
    labelFn: (field) => {
      return field.name || "[Unnamed field]";
    },
  });
}

const initialFields = [makeDefaultEntityFieldDraft()];
const initialFieldOptions = fieldsToSelectOptions(initialFields);

export function EntityCreatorView(): JSX.Element {
  const [datasets] = useLocalDatasets();
  const datasetOptions = makeSelectOptions({
    list: datasets ?? [],
    valueFn: pipe(getProp("id"), String),
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
      onValuesChange: (newValues, prevValues) => {
        // to generate new field options we only care if the names and ids
        // of the fields have changed
        const areFieldsChanged = !areArrayContentsEqual(
          newValues.fields,
          prevValues.fields,
          (field) => {
            return `draftId=${field.draftId}&name=${field.name}`;
          },
        );
        if (areFieldsChanged) {
          setFieldOptions(fieldsToSelectOptions(newValues.fields));
        }
      },
    },
  );

  const [, setFieldOptions] =
    useState<ReadonlyArray<SelectOption<DraftFieldId>>>(initialFieldOptions);

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
            data={datasetOptions}
            label="Dataset"
            {...entityConfigForm.getInputProps("datasetId")}
          />

          <Checkbox
            key={entityConfigForm.key("allowManualCreation")}
            label="Allow manual creation of new entities"
            {...entityConfigForm.getInputProps("allowManualCreation")}
          />

          <FieldCreatorBlock
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
