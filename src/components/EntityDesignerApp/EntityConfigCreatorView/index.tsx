import {
  Box,
  Button,
  Checkbox,
  Container,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { isNotEmpty } from "@mantine/form";
import { useNavigate } from "@tanstack/react-router";
import { isDefined } from "$/lib/utils/guards/isDefined";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLinks } from "@/config/AppLinks";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useForm } from "@/lib/hooks/ui/useForm";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { Paper } from "@/lib/ui/Paper";
import { prop, propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { setValue } from "@/lib/utils/objects/setValue";
import { DatasetColumnFieldsBlock } from "./DatasetColumnFieldsBlock";
import { EntityConfigCreatorStore } from "./EntityConfigCreatorStore";
import {
  EntityConfigFormSubmitValues,
  EntityConfigFormType,
  EntityConfigFormValues,
  getDefaultEntityConfigFormValues,
  makeDefaultDatasetColumnField,
  makeDefaultManualEntryField,
} from "./entityConfigFormTypes";
import { ManualEntryFieldsBlock } from "./ManualEntryFieldsBlock";
import { useSubmitEntityCreatorForm } from "./useSubmitEntityCreatorForm";

const IS_MANUAL_DATA_DISABLED = isFlagEnabled(FeatureFlag.DisableManualData);

export function EntityConfigCreatorView(): JSX.Element {
  const [
    { entityConfigName, singularEntityConfigName, pluralEntityConfigName },
    dispatch,
  ] = EntityConfigCreatorStore.use();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [sendEntityConfigForm, isSendEntityConfigFormPending] =
    useSubmitEntityCreatorForm();

  const entityConfigForm: EntityConfigFormType = useForm({
    mode: "uncontrolled",
    initialValues: getDefaultEntityConfigFormValues(),

    validate: {
      titleFieldId: isNotEmpty("Title field is required"),
      sourceDatasets: {
        primaryKeyColumnId: isNotEmpty("ID field is required"),
      },
    },

    // our transformed values combine all the datasetColumnFields
    // and manualEntryFields into a single `fields` array
    transformValues: (
      values: EntityConfigFormValues,
    ): EntityConfigFormSubmitValues => {
      // collect all the primary key fields
      const primaryKeyColumnIds = new Set(
        values.sourceDatasets.map(prop("primaryKeyColumnId")),
      );
      const primaryKeyFields = values.sourceDatasets
        .map(({ dataset, primaryKeyColumnId }) => {
          if (!primaryKeyColumnId) {
            return undefined;
          }

          // first, let's see if this primary key column was already
          // added as a datasetColumnField.
          const primaryField = values.datasetColumnFields.find(
            propEq(
              "extractors.datasetColumnValue.datasetColumnId",
              primaryKeyColumnId,
            ),
          );

          if (primaryField) {
            // if the primary key field was already added, we want to just
            // use that same field and set `isIdField` to true
            return setValue(primaryField, "isIdField", true);
          }

          // otherwise, create a datasetColumnField for this primary key
          // column, and set `isIdField`
          const datasetColumn = dataset.columns.find(
            propEq("id", primaryKeyColumnId),
          );
          if (datasetColumn) {
            return makeDefaultDatasetColumnField({
              entityConfigId,
              name: datasetColumn.name,
              dataset,
              datasetColumn,
              isIdField: true,
            });
          }
          return undefined;
        })
        .filter(isDefined);

      const nonPrimaryKeyFields = values.datasetColumnFields.filter((field) => {
        if (field.valueExtractorType === "dataset_column_value") {
          return !primaryKeyColumnIds.has(
            field.extractors.datasetColumnValue.datasetColumnId,
          );
        }
        return false;
      });

      const allFields = nonPrimaryKeyFields
        .concat(primaryKeyFields)
        .concat(values.manualEntryFields)
        // set the title field
        .map((field) => {
          return field.id === values.titleFieldId ?
              setValue(field, "isTitleField", true)
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
  ]);
  const nameUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (nameUpdateTimeoutRef.current) {
        clearTimeout(nameUpdateTimeoutRef.current);
      }
    };
  }, []);

  entityConfigForm.useFieldWatch("name", ({ value }) => {
    if (nameUpdateTimeoutRef.current) {
      clearTimeout(nameUpdateTimeoutRef.current);
    }
    nameUpdateTimeoutRef.current = setTimeout(() => {
      dispatch.setEntityConfigName(value);
    }, 150);
  });

  const [allowDatasetFields, setAllowDatasetFields] = useState(false);
  const [allowManualEntryFields, setAllowManualEntryFields] = useState(false);

  const {
    id: entityConfigId,
    datasetColumnFields,
    manualEntryFields,
  } = entityConfigForm.getValues();
  const { fields } = entityConfigForm.getTransformedValues();

  // these are the fields that are eligible to be used as the entity ID or title
  const possibleTitleFields = useMemo(() => {
    return makeSelectOptions(datasetColumnFields.concat(manualEntryFields), {
      valueKey: "id",
      labelKey: "name",
    });
  }, [datasetColumnFields, manualEntryFields]);

  return (
    <Container pt="lg" pb="xxl" fluid w="100%">
      <Paper>
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
            {IS_MANUAL_DATA_DISABLED ? null : (
              <Checkbox
                key={keys.allowManualCreation}
                label={`Allow new ${pluralEntityConfigName} to be created manually`}
                {...inputProps.allowManualCreation({ type: "checkbox" })}
              />
            )}
            <Text>
              Tell us about where the {singularEntityConfigName} data should
              come from...
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
                entityConfigName={singularEntityConfigName}
              />
            : null}
            {IS_MANUAL_DATA_DISABLED ? null : (
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
            )}
            {allowManualEntryFields ?
              <ManualEntryFieldsBlock
                entityConfigId={entityConfigId}
                entityConfigForm={entityConfigForm}
              />
            : null}

            <Select
              key={keys.titleFieldId}
              required
              data={possibleTitleFields}
              placeholder={
                fields.length === 0 ?
                  "No fields have been configured yet"
                : "Select a field"
              }
              label={`What field should be used as a ${singularEntityConfigName}'s name?`}
              {...inputProps.titleFieldId()}
            />

            <Box>
              <Button type="submit" loading={isSendEntityConfigFormPending}>
                Create
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
