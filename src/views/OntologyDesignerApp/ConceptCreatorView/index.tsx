import { makeSelectOptions, Select } from "@avandar/ui";
import { useForm } from "@avandar/ui/hooks";
import { isDefined, prop, propEq, setValue } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { isNotEmpty } from "@mantine/form";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppLinks } from "@/config/AppLinks/AppLinks";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ConceptCreatorStore } from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore/index";
import css from "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorView.module.css";
import {
  ConceptFormSubmitValues,
  ConceptFormType,
  ConceptFormValues,
  getDefaultConceptFormValues,
  makeDefaultDatasetColumnAttribute,
  makeDefaultManualEntryAttribute,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { DatasetColumnAttributesBlock } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/index";
import { ManualEntryAttributesBlock } from "@/views/OntologyDesignerApp/ConceptCreatorView/ManualEntryAttributesBlock";
import { useSubmitConceptCreatorForm } from "@/views/OntologyDesignerApp/ConceptCreatorView/useSubmitConceptCreatorForm";

const IS_MANUAL_DATA_DISABLED = isFlagEnabled(FeatureFlag.DisableManualData);

export function ConceptCreatorView(): JSX.Element {
  const { t } = useLingui();
  const [{ conceptName, singularConceptName, pluralConceptName }, dispatch] =
    ConceptCreatorStore.useContext();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [sendConceptForm, isSendConceptFormPending] =
    useSubmitConceptCreatorForm();

  const conceptForm: ConceptFormType = useForm({
    mode: "uncontrolled",
    initialValues: getDefaultConceptFormValues(),

    validate: {
      labelAttributeId: isNotEmpty(t`Title field is required`),
      sourceDatasets: {
        primaryKeyColumnId: isNotEmpty(t`ID field is required`),
      },
    },

    // our transformed values combine all the datasetColumnAttributes
    // and manualEntryAttributes into a single `attributes` array
    transformValues: (values: ConceptFormValues): ConceptFormSubmitValues => {
      // collect all the primary key attributes
      const primaryKeyColumnIds = new Set(
        values.sourceDatasets.map(prop("primaryKeyColumnId")),
      );
      const identifierAttributes = values.sourceDatasets
        .map(({ dataset, primaryKeyColumnId }) => {
          if (!primaryKeyColumnId) {
            return undefined;
          }

          // first, let's see if this primary key column was already
          // added as a datasetColumnAttribute.
          const identifierAttribute = values.datasetColumnAttributes.find(
            propEq(
              "mappings.datasetColumn.datasetColumnId",
              primaryKeyColumnId,
            ),
          );

          if (identifierAttribute) {
            // if the primary key attribute was already added, we want to just
            // use that same attribute and set `isIdentifier` to true
            return setValue(identifierAttribute, "isIdentifier", true);
          }

          // otherwise, create a datasetColumnAttribute for this primary key
          // column, and set `isIdentifier`
          const datasetColumn = dataset.columns.find(
            propEq("id", primaryKeyColumnId),
          );
          if (datasetColumn) {
            return makeDefaultDatasetColumnAttribute({
              conceptId,
              name: datasetColumn.name,
              dataset,
              datasetColumn,
              isIdentifier: true,
            });
          }
          return undefined;
        })
        .filter(isDefined);

      const nonIdentifierAttributes = values.datasetColumnAttributes.filter(
        (attribute) => {
          if (attribute.mappingType === "dataset_column") {
            return !primaryKeyColumnIds.has(
              attribute.mappings.datasetColumn.datasetColumnId,
            );
          }
          return false;
        },
      );

      const allAttributes = nonIdentifierAttributes
        .concat(identifierAttributes)
        .concat(values.manualEntryAttributes)
        // set the title attribute
        .map((attribute) => {
          return attribute.id === values.labelAttributeId
            ? setValue(attribute, "isLabel", true)
            : attribute;
        });
      return {
        ...values,
        attributes: allAttributes,
      };
    },
  });

  const [keys, inputProps] = conceptForm.keysAndProps([
    "name",
    "description",
    "allowManualCreation",
    "labelAttributeId",
  ]);
  const nameUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (nameUpdateTimeoutRef.current) {
        clearTimeout(nameUpdateTimeoutRef.current);
      }
    };
  }, []);

  conceptForm.useFieldWatch("name", ({ value }) => {
    if (nameUpdateTimeoutRef.current) {
      clearTimeout(nameUpdateTimeoutRef.current);
    }
    nameUpdateTimeoutRef.current = setTimeout(() => {
      dispatch.setConceptName(value);
    }, 150);
  });

  const [allowDatasetAttributes, setAllowDatasetAttributes] = useState(false);
  const [allowManualEntryAttributes, setAllowManualEntryAttributes] =
    useState(false);

  const {
    id: conceptId,
    datasetColumnAttributes,
    manualEntryAttributes,
  } = conceptForm.getValues();
  const { attributes } = conceptForm.getTransformedValues();

  // these are the attributes eligible to be the concept's identifier or label
  const possibleLabelAttributes = useMemo(() => {
    return makeSelectOptions(
      datasetColumnAttributes.concat(manualEntryAttributes),
      {
        valueKey: "id",
        labelKey: "name",
      },
    );
  }, [datasetColumnAttributes, manualEntryAttributes]);

  return (
    <Container className={css.page} pt="xxl" px="lg">
      <Stack gap="lg">
        <header className={css.header}>
          <Title order={2} fw={650}>
            <Trans>New case type</Trans>
          </Title>
          <Text c="dimmed" size="sm" maw={520}>
            <Trans>
              Name this case type and say where its fields come from. Map
              columns from existing datasets, or add fields to fill in by hand.
            </Trans>
          </Text>
        </header>
        <Divider />
        <Box className={css.panel}>
          <form
            onSubmit={conceptForm.onSubmit((values) => {
              return sendConceptForm(values, {
                onSuccess: () => {
                  navigate(
                    AppLinks.ontologyDesignerConceptView({
                      workspaceSlug: workspace.slug,
                      conceptId,
                      conceptName,
                    }),
                  );
                },
              });
            })}
          >
            <Stack gap="md">
              <TextInput
                key={keys.name}
                required
                label={t`Case type name`}
                placeholder={t`For example, County or Household`}
                {...inputProps.name()}
              />
              <TextInput
                key={keys.description}
                label={t`Description`}
                placeholder={t`What does this case type represent?`}
                {...inputProps.description()}
              />
              {IS_MANUAL_DATA_DISABLED ? null : (
                <Checkbox
                  key={keys.allowManualCreation}
                  label={t`Allow new ${pluralConceptName} to be created manually`}
                  {...inputProps.allowManualCreation({ type: "checkbox" })}
                />
              )}
              <Text>
                <Trans>
                  Tell us about where the {singularConceptName} data should come
                  from...
                </Trans>
              </Text>
              <Switch
                label={t`Some data should come from existing datasets`}
                checked={allowDatasetAttributes}
                onChange={(e) => {
                  setAllowDatasetAttributes(e.currentTarget.checked);
                }}
              />
              {allowDatasetAttributes ? (
                <DatasetColumnAttributesBlock
                  conceptId={conceptId}
                  conceptForm={conceptForm}
                  conceptName={conceptName.trim() || t`record`}
                />
              ) : null}
              {IS_MANUAL_DATA_DISABLED ? null : (
                <Switch
                  label={t`Some data should be manually entered`}
                  checked={allowManualEntryAttributes}
                  onChange={(e) => {
                    const displayManualEntryAttributes =
                      e.currentTarget.checked;
                    setAllowManualEntryAttributes(displayManualEntryAttributes);

                    // clear the list when we turn off the switch
                    // TODO(jpsyx): store a backup of the list for when
                    // we turn it back on.
                    if (!displayManualEntryAttributes) {
                      conceptForm.setFieldValue("manualEntryAttributes", []);
                    }
                    if (
                      displayManualEntryAttributes &&
                      conceptForm.getValues().manualEntryAttributes.length === 0
                    ) {
                      conceptForm.insertListItem(
                        "manualEntryAttributes",
                        makeDefaultManualEntryAttribute({
                          conceptId,
                          name: t`New field`,
                        }),
                      );
                    }
                  }}
                />
              )}
              {allowManualEntryAttributes ? (
                <ManualEntryAttributesBlock
                  conceptId={conceptId}
                  conceptForm={conceptForm}
                />
              ) : null}

              <Select
                key={keys.labelAttributeId}
                required
                data={possibleLabelAttributes}
                placeholder={
                  attributes.length === 0
                    ? t`No fields have been configured yet`
                    : t`Select a field`
                }
                label={t`What field should be used as a ${singularConceptName}'s name?`}
                {...inputProps.labelAttributeId()}
              />

              <Box>
                <Button type="submit" loading={isSendConceptFormPending}>
                  <Trans>Create case type</Trans>
                </Button>
              </Box>
            </Stack>
          </form>
        </Box>
      </Stack>
    </Container>
  );
}
