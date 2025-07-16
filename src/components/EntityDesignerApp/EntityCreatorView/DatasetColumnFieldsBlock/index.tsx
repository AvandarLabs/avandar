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
import { LocalDatasetSelect } from "@/components/common/LocalDatasetSelect";
import { useMap } from "@/lib/hooks/state/useMap";
import { Callout } from "@/lib/ui/Callout";
import { SegmentedControl } from "@/lib/ui/inputs/SegmentedControl";
import { makeSegmentedControlItems } from "@/lib/ui/inputs/SegmentedControl/makeSegmentedControlItems";
import { removeItemWhere } from "@/lib/utils/arrays";
import { getProp, propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { EntityFieldConfigId } from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfigId } from "@/models/EntityConfig/types";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDatasetFieldId } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDatasetId } from "@/models/LocalDataset/types";
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
  const { datasetColumnFields } = entityConfigForm.getValues();
  const [selectedDatasetId, setSelectedDatasetId] =
    useState<LocalDatasetId | null>(null);

  const [selectedDatasetColumnId, setSelectedDatasetColumnId] = useState<
    LocalDatasetFieldId | undefined
  >();

  const [selectedDataset] = LocalDatasetClient.useGetById({
    id: selectedDatasetId,
    useQueryOptions: { enabled: !!selectedDatasetId },
  });

  const selectedDatasetColumn = useMemo(() => {
    return selectedDatasetColumnId ?
        selectedDataset?.fields.find(propEquals("id", selectedDatasetColumnId))
      : undefined;
  }, [selectedDataset, selectedDatasetColumnId]);

  const [selectedFieldId, setSelectedFieldId] = useState<
    EntityFieldConfigId | undefined
  >();

  const [fieldToColumnMap, updateFieldToColumnMap] = useMap<
    EntityFieldConfigId,
    LocalDatasetFieldId
  >();

  const addedColumns = useMemo(() => {
    return [...fieldToColumnMap.values()];
  }, [fieldToColumnMap]);

  const fieldItems = useMemo(() => {
    return makeSegmentedControlItems(datasetColumnFields, {
      valueFn: getProp("id"),
      labelFn: getProp("name"),
    });
  }, [datasetColumnFields]);

  const addDatasetColumnAsField = useCallback(() => {
    if (selectedDataset && selectedDatasetColumn) {
      const newField = makeDefaultDatasetColumnField({
        entityConfigId,
        name: selectedDatasetColumn.name,
        dataset: selectedDataset,
        datasetColumn: selectedDatasetColumn,
      });

      // link this field to the dataset column it's based on
      updateFieldToColumnMap.set(newField.id, selectedDatasetColumn.id);
      if (datasetColumnFields.length === 0) {
        // if this is the first field we're adding to the `fields` array,
        // then automatically select it
        setSelectedFieldId(newField.id);
      }

      // add this field to the form data
      entityConfigForm.insertListItem("datasetColumnFields", newField);
    }
  }, [
    datasetColumnFields,
    entityConfigForm,
    entityConfigId,
    selectedDataset,
    selectedDatasetColumn,
    updateFieldToColumnMap,
  ]);

  const removeField = useCallback(() => {
    if (selectedFieldId) {
      const newFields = removeItemWhere(
        datasetColumnFields,
        propEquals("id", selectedFieldId),
      );
      entityConfigForm.setFieldValue("datasetColumnFields", newFields);
      updateFieldToColumnMap.delete(selectedFieldId);

      // reset the selected field to be the first field in the list
      setSelectedFieldId(newFields[0]?.id);
    }
  }, [
    entityConfigForm,
    datasetColumnFields,
    selectedFieldId,
    updateFieldToColumnMap,
  ]);

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
        <Group>
          <LocalDatasetSelect onChange={setSelectedDatasetId} />
        </Group>
        <Group align="flex-start">
          <Stack gap="xs">
            <Text size="xs" c="dark" tt="uppercase" lts="0.1em">
              Dataset columns
            </Text>
            <ScrollArea h={300} pr="xs">
              <LocalDatasetColumnPickerList
                datasetId={selectedDatasetId ?? undefined}
                onChange={setSelectedDatasetColumnId}
                excludeColumns={addedColumns}
              />
            </ScrollArea>
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
              disabled={datasetColumnFields.length === 0}
              onClick={removeField}
            >
              <IconArrowLeft size={24} />
            </ActionIcon>
          </Stack>
          <Stack gap="xs">
            <Text size="xs" c="dark" tt="uppercase" lts="0.1em">
              Profile fields
            </Text>
            {datasetColumnFields.length === 0 ?
              <Text>No columns have been added yet</Text>
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
                fieldIdx={datasetColumnFields.findIndex(
                  propEquals("id", selectedFieldId),
                )}
                fieldName={
                  datasetColumnFields.find(propEquals("id", selectedFieldId))!
                    .name
                }
              />
            </Box>
          : null}
        </Group>

        <Divider my="xs" />

        <Callout.Info
          title={`Configure how to identify a ${entityConfigName} across datasets`}
          icon={<IconCircleNumber2Filled />}
        >
          <Text>
            For each dataset you've added, please specify which column should be
            used to uniquely identify a {entityConfigName}.
          </Text>
          <Text>
            This is how we can detect which rows in different datasets represent
            the same {entityConfigName}.
          </Text>
        </Callout.Info>
        <IDConfigBlock
          entityConfigForm={entityConfigForm}
          entityConfigName={entityConfigName}
        />
      </Stack>
    </Fieldset>
  );
}
