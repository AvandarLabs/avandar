import { Button, Fieldset, Stack, Text } from "@mantine/core";
import { FormSetters, FormType } from "@/lib/hooks/ui/useForm";
import {
  EntityConfigFormValues,
  getDefaultEntityFieldFormValues,
} from "./entityCreatorTypes";
import { EntityFieldCreator } from "./EntityFieldCreator";

type Props = {
  entityConfigForm: FormType<EntityConfigFormValues>;
  formSetters: FormSetters<EntityConfigFormValues>;
};

export function EntityFieldCreatorBlock({
  entityConfigForm,
  formSetters,
}: Props): JSX.Element {
  const { id: entityConfigId, name, fields } = entityConfigForm.getValues();
  const entityName = name || "Entity";

  const fieldRows = fields.map((field, idx) => {
    return (
      <EntityFieldCreator
        key={field.id}
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
              getDefaultEntityFieldFormValues({
                entityConfigId,
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
