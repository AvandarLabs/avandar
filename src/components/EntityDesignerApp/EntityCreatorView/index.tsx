import { Button, Checkbox, Container, Stack, TextInput } from "@mantine/core";
import { formRootRule, isNotEmpty } from "@mantine/form";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "@/lib/hooks/ui/useForm";
import { isNotEqualTo } from "@/lib/hooks/ui/useForm/validators";
import { xpropDoesntEqual } from "@/lib/utils/objects/higherOrderFuncs";
import { getEntityConfigLinkProps } from "@/models/EntityConfig/utils";
import {
  EntityConfigFormValues,
  getDefaultEntityConfigFormValues,
} from "./entityCreatorTypes";
import { EntityFieldCreatorBlock } from "./EntityFieldCreatorBlock";
import { useSubmitEntityCreatorForm } from "./useSubmitEntityCreatorForm";

export function EntityCreatorView(): JSX.Element {
  const router = useRouter();
  const [sendEntityConfigForm, isSendEntityConfigFormPending] =
    useSubmitEntityCreatorForm();

  const entityConfigForm = useForm<EntityConfigFormValues>({
    mode: "uncontrolled",
    initialValues: getDefaultEntityConfigFormValues(),
    validate: {
      datasetId: (datasetId, formValues) => {
        const fieldsThatNeedDataset = formValues.fields.filter(
          xpropDoesntEqual("options.valueExtractorType", "manual_entry"),
        );
        if (!datasetId && fieldsThatNeedDataset.length > 0) {
          return "Dataset cannot be left empty if a field requires one.";
        }
        return null;
      },

      fields: {
        [formRootRule]: isNotEmpty("At least one field is required"),
        options: {
          valueExtractorType: isNotEqualTo(
            "aggregation",
            "Aggregation is not a supported value extractor type yet. Please choose something else.",
          ),
        },
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

  const [entityConfigName, setEntityConfigName] = useState("");

  entityConfigForm.watch("name", ({ value }) => {
    // TODO(jpsyx): add a debounce
    setEntityConfigName(value);
  });

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
            label="Profile Name"
            placeholder="Enter a name for this profile type"
            {...inputProps.name()}
          />
          <TextInput
            key={keys.description}
            label="Profile Description"
            placeholder="Enter a description for this profile type"
            {...inputProps.description()}
          />

          <Checkbox
            key={keys.allowManualCreation}
            label={`Can new new ${entityConfigName || "profile"}s be created manually?`}
            {...inputProps.allowManualCreation({ type: "checkbox" })}
          />

          <EntityFieldCreatorBlock
            entityConfigId={entityConfigForm.getValues().id}
            entityConfigForm={entityConfigForm}
            entityConfigName={entityConfigName || "Profile"}
          />

          <Button type="submit" loading={isSendEntityConfigFormPending}>
            Create
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
