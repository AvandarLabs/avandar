import {
  Button,
  Checkbox,
  Container,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLinks } from "@/config/AppLinks";
import { useForm } from "@/lib/hooks/ui/useForm";
import { useCurrentWorkspace } from "@/lib/hooks/workspaces/useCurrentWorkspace";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { setValue } from "@/lib/utils/objects/setValue";
import { DatasetColumnFieldsBlock } from "./DatasetColumnFieldsBlock";
import {
  EntityConfigFormSubmitValues,
  EntityConfigFormValues,
  getDefaultEntityConfigFormValues,
  makeDefaultManualEntryField,
} from "./entityConfigFormTypes";
import { ManualEntryFieldsBlock } from "./ManualEntryFieldsBlock";
import { useSubmitEntityCreatorForm } from "./useSubmitEntityCreatorForm";

export function EntityCreatorView(): JSX.Element {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [sendEntityConfigForm, isSendEntityConfigFormPending] =
    useSubmitEntityCreatorForm();

  const entityConfigForm = useForm<
    EntityConfigFormValues,
    EntityConfigFormSubmitValues
  >({
    mode: "uncontrolled",
    initialValues: getDefaultEntityConfigFormValues(),
    transformValues: (values: EntityConfigFormValues) => {
      const allFields = values.datasetColumnFields
        .concat(values.manualEntryFields)
        // set the id field
        .map((field) => {
          return (
              field.id === values.idFieldId &&
                field.options.class === "dimension"
            ) ?
              setValue(field, "options.isIdField", true)
            : field;
        })
        // set the title field
        .map((field) => {
          return (
              field.id === values.titleFieldId &&
                field.options.class === "dimension"
            ) ?
              setValue(field, "options.isTitleField", true)
            : field;
        });
      return {
        ...values,
        fields: allFields,
      };
    },
  });

  const [keys, inputProps] = entityConfigForm.keysAndProps([
    "name",
    "description",
    "allowManualCreation",
    "titleFieldId",
    "idFieldId",
  ]);

  entityConfigForm.watch("name", ({ value }) => {
    // TODO(jpsyx): add a debounce
    setEntityConfigName(value);
  });

  const [allowDatasetFields, setAllowDatasetFields] = useState(false);
  const [allowManualEntryFields, setAllowManualEntryFields] = useState(false);

  const [entityConfigName, setEntityConfigName] = useState("");
  const singularEntityConfigName = entityConfigName.toLowerCase() || "profile";
  const pluralEntityConfigName = `${entityConfigName.toLowerCase() || "profile"}s`;

  const {
    id: entityConfigId,
    datasetColumnFields,
    manualEntryFields,
  } = entityConfigForm.getValues();

  // these are the fields that are eligible to be used as the entity ID or title
  const possibleTitleOrIdFields = useMemo(() => {
    return makeSelectOptions(datasetColumnFields.concat(manualEntryFields), {
      valueFn: getProp("id"),
      labelFn: getProp("name"),
    });
  }, [datasetColumnFields, manualEntryFields]);

  return (
    <Container pt="lg">
      <form
        onSubmit={entityConfigForm.onSubmit((values) => {
          return sendEntityConfigForm(values, {
            onSuccess: () => {
              navigate(
                AppLinks.entityDesignerConfigView({
                  workspaceSlug: workspace.slug,
                  entityConfigId,
                  entityConfigName,
                }),
              );
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
            label={`Allow new ${pluralEntityConfigName} to be created manually`}
            {...inputProps.allowManualCreation({ type: "checkbox" })}
          />
          <Text>
            Tell us about where the {singularEntityConfigName} data should come
            from...
          </Text>
          <Switch
            label={`Some data should come from existing datasets`}
            checked={allowDatasetFields}
            onChange={(e) => {
              setAllowDatasetFields(e.currentTarget.checked);
            }}
          />
          {allowDatasetFields ?
            <DatasetColumnFieldsBlock
              entityConfigId={entityConfigId}
              entityConfigForm={entityConfigForm}
            />
          : null}
          <Switch
            label="Some data should be manually entered"
            checked={allowManualEntryFields}
            onChange={(e) => {
              const displayManualEntryFields = e.currentTarget.checked;
              setAllowManualEntryFields(displayManualEntryFields);

              // clear the list when we turn off the switch
              // TODO(jpsyx): we should store a backup of the list for when
              // we turn it back on.
              if (!displayManualEntryFields) {
                entityConfigForm.setFieldValue("manualEntryFields", []);
              }
              if (
                displayManualEntryFields &&
                entityConfigForm.getValues().manualEntryFields.length === 0
              ) {
                entityConfigForm.insertListItem(
                  "manualEntryFields",
                  makeDefaultManualEntryField({
                    entityConfigId,
                    name: "New field",
                  }),
                );
              }
            }}
          />
          {allowManualEntryFields ?
            <ManualEntryFieldsBlock
              entityConfigId={entityConfigId}
              entityConfigForm={entityConfigForm}
            />
          : null}

          <Select
            key={keys.idFieldId}
            required
            data={possibleTitleOrIdFields}
            label={`What field should be used as a ${singularEntityConfigName}'s ID?`}
            {...inputProps.idFieldId()}
          />

          <Select
            key={keys.titleFieldId}
            required
            data={possibleTitleOrIdFields}
            label={`What field should be used as a ${singularEntityConfigName}'s name?`}
            {...inputProps.titleFieldId()}
          />

          <Button type="submit" loading={isSendEntityConfigFormPending}>
            Create
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
