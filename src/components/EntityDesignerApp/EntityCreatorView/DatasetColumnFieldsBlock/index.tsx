import {
  ActionIcon,
  Box,
  Divider,
  Fieldset,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCircleNumber1Filled,
  IconCircleNumber2Filled,
} from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { LocalDatasetColumnPickerList } from "@/components/common/LocalDatasetColumnPickerList";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMap } from "@/lib/hooks/state/useMap";
import { Callout } from "@/lib/ui/Callout";
import { SegmentedControl } from "@/lib/ui/inputs/SegmentedControl";
import { makeSegmentedControlItems } from "@/lib/ui/inputs/SegmentedControl/makeSegmentedControlItems";
import { removeItemWhere } from "@/lib/utils/arrays";
import { where } from "@/lib/utils/filters/filterBuilders";
import { identity } from "@/lib/utils/misc";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp, propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { EntityFieldConfigId } from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfigId } from "@/models/EntityConfig/types";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import {
  LocalDatasetField,
  LocalDatasetFieldId,
} from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDataset } from "@/models/LocalDataset/types";
import {
  EntityConfigFormType,
  makeDefaultDatasetColumnField,
} from "../entityConfigFormTypes";
import { DatasetColumnExtractorCreator } from "./DatasetColumnExtractorCreator";
import { IDConfigBlock } from "./IDConfigBlock";

type Props = {
  entityConfigForm: EntityConfigFormType;
  entityConfigId: EntityConfigId;
  entityConfigName: string;
};

export function DatasetColumnFieldsBlock({
  entityConfigForm,
  entityConfigId,
  entityConfigName,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [selectedDatasetColumnId, setSelectedDatasetColumnId] = useState<
    LocalDatasetFieldId | undefined
  >();
  const [selectedFieldId, setSelectedFieldId] = useState<
    EntityFieldConfigId | undefined
  >();

  // load all local datasets and all available columns
  const [localDatasets] = LocalDatasetClient.useGetAll(
    where("workspaceId", "eq", workspace.id),
  );

  const localDatasetsToUse = useMemo(() => {
    return localDatasets?.filter((dataset) => {
      return (
        dataset.datasetType !== "entity_field_values" &&
        dataset.datasetType !== "entities_queryable" &&
        dataset.datasetType !== "entities"
      );
    });
  }, [localDatasets]);

  const datasetColumnLookup: Record<
    LocalDatasetFieldId,
    { dataset: LocalDataset; field: LocalDatasetField }
  > = useMemo(() => {
    if (!localDatasetsToUse) {
      return {};
    }
    return makeObjectFromList(
      localDatasetsToUse.flatMap((dataset) => {
        return dataset.fields.map((field) => {
          return { dataset, field };
        });
      }),
      {
        keyFn: getProp("field.id"),
        valueFn: identity,
      },
    );
  }, [localDatasetsToUse]);
  console.log(localDatasetsToUse);
  // Keep track of the fields we've added and the dataset columns they map to
  const [fieldToColumnMap, updateFieldToColumnMap] = useMap<
    EntityFieldConfigId,
    LocalDatasetFieldId
  >();

  // these are the fields that we've already added
  const addedColumns = useMemo(() => {
    return [...fieldToColumnMap.values()];
  }, [fieldToColumnMap]);
  const { datasetColumnFields: addedFields } = entityConfigForm.getValues();

  const fieldItems = useMemo(() => {
    return makeSegmentedControlItems(addedFields, {
      valueFn: getProp("id"),
      labelFn: getProp("name"),
    });
  }, [addedFields]);

  const addDatasetColumnAsField = useCallback(() => {
    if (
      selectedDatasetColumnId &&
      datasetColumnLookup[selectedDatasetColumnId]
    ) {
      const { field: selectedDatasetColumn, dataset: selectedDataset } =
        datasetColumnLookup[selectedDatasetColumnId];

      if (selectedDatasetColumn && selectedDataset) {
        const newField = makeDefaultDatasetColumnField({
          entityConfigId,
          name: selectedDatasetColumn.name,
          dataset: selectedDataset,
          datasetColumn: selectedDatasetColumn,
        });

        // link this field to the dataset column it's based on
        updateFieldToColumnMap.set(newField.id, selectedDatasetColumn.id);
        if (addedFields.length === 0) {
          // if this is the first field we're adding to the `fields` array,
          // then automatically select it
          setSelectedFieldId(newField.id);
        }

        // add this field to the form data
        entityConfigForm.insertListItem("datasetColumnFields", newField);

        // if the selected dataset isn't already in our sourceDatasets array,
        // add it
        const { sourceDatasets } = entityConfigForm.getValues();
        if (
          !sourceDatasets.some(propEquals("dataset.id", selectedDataset.id))
        ) {
          entityConfigForm.insertListItem("sourceDatasets", {
            dataset: selectedDataset,
            primaryKeyColumnId: undefined,
          });
        }
      }
    }
  }, [
    addedFields,
    entityConfigForm,
    entityConfigId,
    datasetColumnLookup,
    selectedDatasetColumnId,
    updateFieldToColumnMap,
  ]);

  const removeField = useCallback(() => {
    if (selectedFieldId) {
      const selectedField = addedFields.find(propEquals("id", selectedFieldId));
      const sourceDatasetId =
        selectedField?.extractors.datasetColumnValue.datasetId;
      const newFields = removeItemWhere(
        addedFields,
        propEquals("id", selectedFieldId),
      );
      entityConfigForm.setFieldValue("datasetColumnFields", newFields);
      updateFieldToColumnMap.delete(selectedFieldId);

      // reset the selected field to be the first field in the list
      setSelectedFieldId(newFields[0]?.id);

      // if we removed a field, we might need to remove it from our
      // `sourceDatasets` array.
      // First, check if there's another field that relies on this same dataset
      const isSourceDatasetStillUsed = newFields.some(
        propEquals("extractors.datasetColumnValue.datasetId", sourceDatasetId),
      );
      if (!isSourceDatasetStillUsed && sourceDatasetId) {
        // no remaining fields are using this dataset, so we can safely remove
        // it from our `sourceDatasets` list
        const sourceDatasetIdx = entityConfigForm
          .getValues()
          .sourceDatasets.findIndex(propEquals("dataset.id", sourceDatasetId));
        entityConfigForm.removeListItem("sourceDatasets", sourceDatasetIdx);
      }
    }
  }, [entityConfigForm, addedFields, selectedFieldId, updateFieldToColumnMap]);

  return (
    <Fieldset legend="Fields that come from datasets">
      <Stack>
        <Callout.Info
          title="Select the columns you want in this profile"
          icon={<IconCircleNumber1Filled />}
        >
          <Text>
            A profile can consist of columns that come from different datasets.
          </Text>
          <Text>
            This is where you select which columns from which datasets should be
            added into this profile.
          </Text>
        </Callout.Info>
        <Group align="flex-start">
          <Stack gap="xs">
            <Text size="xs" c="dark" tt="uppercase" lts="0.1em">
              Dataset columns
            </Text>
            <Divider />
            <LocalDatasetColumnPickerList
              datasetIds={localDatasetsToUse?.map(getProp("id")) ?? []}
              onChange={(value) => {
                setSelectedDatasetColumnId(value);
              }}
              excludeColumns={addedColumns}
            />
          </Stack>
          <Stack gap="xxxs" pt="lg">
            <ActionIcon
              variant="subtle"
              color="neutral"
              aria-label="Add column as a field"
              className={`data-[disabled]:bg-transparent`}
              disabled={!selectedDatasetColumnId}
              onClick={addDatasetColumnAsField}
            >
              <IconArrowRight size={24} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="neutral"
              aria-label="Remove field"
              className={`data-[disabled]:bg-transparent`}
              disabled={addedFields.length === 0}
              onClick={removeField}
            >
              <IconArrowLeft size={24} />
            </ActionIcon>
          </Stack>
          <Stack gap="xs">
            <Text size="xs" c="dark" tt="uppercase" lts="0.1em">
              Profile fields
            </Text>
            <Divider />
            {addedFields.length === 0 ?
              <Text>No columns have been added yet.</Text>
            : <ScrollArea h={300}>
                <SegmentedControl
                  orientation="vertical"
                  data={fieldItems}
                  value={selectedFieldId}
                  onChange={setSelectedFieldId}
                />
              </ScrollArea>
            }
          </Stack>
          {selectedFieldId ?
            <Box pt="sm">
              <DatasetColumnExtractorCreator
                entityConfigForm={entityConfigForm}
                fieldIdx={addedFields.findIndex(
                  propEquals("id", selectedFieldId),
                )}
                fieldName={
                  addedFields.find(propEquals("id", selectedFieldId))!.name
                }
              />
            </Box>
          : null}
        </Group>

        <Divider my="xs" />
        {localDatasetsToUse && localDatasetsToUse.length > 1 ?
          <Callout.Info
            title="Configure how to join datasets"
            icon={<IconCircleNumber2Filled />}
          >
            <Text>
              For each dataset you've added, please specify which columns should
              be used to uniquely identify a {entityConfigName}.
            </Text>
            <Text>
              We will use those columns to merge datasets into a single{" "}
              {entityConfigName}.
            </Text>
          </Callout.Info>
        : null}
        {addedFields.length > 0 ?
          <IDConfigBlock
            entityConfigForm={entityConfigForm}
            entityConfigName={entityConfigName}
          />
        : <Text>No columns have been added yet.</Text>}
      </Stack>
    </Fieldset>
  );
}
