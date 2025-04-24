import { Button, Fieldset, Stack, Text } from "@mantine/core";
import { FormSetters, FormType } from "@/lib/hooks/ui/useForm";
import { makeDefaultEntityFieldDraft } from "@/models/EntityConfig/EntityFieldConfig/utils";
import { EntityFieldCreator } from "./EntityFieldCreator";
import { EntityConfigForm } from "./types";

type Props = {
  entityConfigForm: FormType<EntityConfigForm>;
  formSetters: FormSetters<EntityConfigForm>;
};

export function EntityFieldCreatorBlock({
  entityConfigForm,
  formSetters,
}: Props): JSX.Element {
  const { name, fields } = entityConfigForm.getValues();
  const entityName = name || "Entity";

  const fieldRows = fields.map((field, idx) => {
    return (
      <EntityFieldCreator
        key={field.draftId}
        defaultField={field}
        entityConfigForm={entityConfigForm}
        idx={idx}
        entityName={entityName}
      />
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
            formSetters.insertListItem(
              "fields",
              makeDefaultEntityFieldDraft({
                name: "New field",
                isIdField: false,
                isTitleField: false,
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
