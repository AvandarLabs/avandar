import { Button, Container, Stack, TextInput } from "@mantine/core";
import { formRootRule, isNotEmpty } from "@mantine/form";
import { useState } from "react";
import { useForm } from "@/lib/hooks/ui/useForm";
import { makeSelectOptions } from "@/lib/ui/Select/makeSelectOptions";
import { SelectOption } from "@/lib/ui/Select/Select";
import { areArrayContentsEqual } from "@/lib/utils/arrays";
import { getProp } from "@/lib/utils/objects";
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
    inputList: fields,
    valueFn: getProp("draftId"),
    labelFn: (field) => {
      return field.name || "[Unnamed field]";
    },
  });
}

const initialFields = [makeDefaultEntityFieldDraft()];
const initialFieldOptions = fieldsToSelectOptions(initialFields);

export function EntityCreatorView(): JSX.Element {
  const [doCreateEntityConfig, pendingEntityConfigCreate] =
    EntityConfigClient.withLogger().useInsert();

  const [entityConfigForm, entityConfigFormSetters] = useForm<EntityConfigForm>(
    {
      mode: "uncontrolled",
      initialValues: {
        name: "",
        description: "",
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
          };

          doCreateEntityConfig({ data: entityConfig });
        })}
      >
        <Stack>
          <TextInput
            key={entityConfigForm.key("name")}
            required
            label="Entity Name (should be a combo box)"
            placeholder="Enter a name for the entity"
            {...entityConfigForm.getInputProps("name")}
          />
          <TextInput
            key={entityConfigForm.key("description")}
            label="Entity Description"
            placeholder="Enter a description for the entity"
            {...entityConfigForm.getInputProps("description")}
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
