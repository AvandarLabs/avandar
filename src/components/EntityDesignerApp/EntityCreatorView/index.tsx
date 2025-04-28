import { Button, Checkbox, Container, Stack, TextInput } from "@mantine/core";
import { formRootRule, isNotEmpty } from "@mantine/form";
import { useRouter } from "@tanstack/react-router";
import { LocalDatasetSelect } from "@/components/common/LocalDatasetSelect";
import { useForm } from "@/lib/hooks/ui/useForm";
import { getEntityConfigLinkProps } from "@/models/EntityConfig/utils";
import {
  EntityConfigFormValues,
  getDefaultEntityConfigFormValues,
} from "./entityCreatorTypes";
import { EntityFieldCreatorBlock } from "./EntityFieldCreatorBlock";
import { useSubmitFullEntityConfigForm } from "./useSubmitFullEntityConfigForm";

export function EntityCreatorView(): JSX.Element {
  const router = useRouter();
  const [sendEntityConfigForm, isSendEntityConfigFormPending] =
    useSubmitFullEntityConfigForm();

  const [entityConfigForm, entityConfigFormSetters] =
    useForm<EntityConfigFormValues>({
      mode: "uncontrolled",
      initialValues: getDefaultEntityConfigFormValues(),
      validate: {
        fields: {
          [formRootRule]: isNotEmpty("At least one field is required"),
        },
      },
    });

  const [keys, inputProps] = entityConfigForm.keysAndProps([
    "name",
    "description",
    "datasetId",
    "allowManualCreation",
    "fields",
  ]);

  return (
    <Container pt="lg">
      <form
        onSubmit={entityConfigForm.onSubmit((values) => {
          return sendEntityConfigForm(values, {
            onSuccess: () => {
              const entityConfigId = values.id;
              router.navigate(getEntityConfigLinkProps(entityConfigId));
            },
          });
        })}
      >
        <Stack>
          <TextInput
            key={keys.name}
            required
            label="Entity Name"
            placeholder="Enter a name for the entity"
            {...inputProps.name()}
          />
          <TextInput
            key={keys.description}
            label="Entity Description"
            placeholder="Enter a description for the entity"
            {...inputProps.description()}
          />

          <LocalDatasetSelect
            key={keys.datasetId}
            label="Dataset source"
            {...inputProps.datasetId()}
          />

          <Checkbox
            key={keys.allowManualCreation}
            label="Allow manual creation of new entities"
            {...inputProps.allowManualCreation({ type: "checkbox" })}
          />

          <EntityFieldCreatorBlock
            entityConfigForm={entityConfigForm}
            formSetters={entityConfigFormSetters}
          />

          <Button type="submit" loading={isSendEntityConfigFormPending}>
            Create
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
