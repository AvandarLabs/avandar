import {
  Callout,
  makeSegmentedControlItems,
  SegmentedControl,
} from "@avandar/ui";
import { identity, makeObject, prop, propEq } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
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
import { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import { useCallback, useMemo, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnPickerList } from "@/components/DatasetColumnPickerList";
import { useMap } from "@/lib/hooks/state/useMap";
import { removeItemWhere } from "@/lib/utils/arrays/removeItemWhere/removeItemWhere";
import {
  ConceptFormType,
  makeDefaultDatasetColumnAttribute,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { DatasetColumnMappingCreator } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/DatasetColumnMappingCreator";
import { IdentifierBlock } from "@/views/OntologyDesignerApp/ConceptCreatorView/DatasetColumnAttributesBlock/IdentifierBlock/index";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";

type Props = {
  conceptForm: ConceptFormType;
  conceptId: ConceptId;
  conceptName: string;
};

export function DatasetColumnAttributesBlock({
  conceptForm,
  conceptId,
  conceptName,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [selectedDatasetColumnId, setSelectedDatasetColumnId] = useState<
    DatasetColumnId | undefined
  >();
  const [selectedAttributeId, setSelectedAttributeId] = useState<
    ConceptAttributeId | undefined
  >();

  // load all datasets and all available columns
  const [allDatasets] = DatasetClient.useGetAllDatasetsWithColumns();
  const datasetColumnLookup: Record<
    DatasetColumn.Id,
    { dataset: DatasetWithColumns; column: DatasetColumn.T }
  > = useMemo(() => {
    if (!allDatasets) {
      return {};
    }
    return makeObject(
      allDatasets.flatMap((dataset) => {
        return dataset.columns.map((column) => {
          return { dataset, column };
        });
      }),
      {
        keyFn: prop("column.id"),
        valueFn: identity,
      },
    );
  }, [allDatasets]);

  // Keep track of the attributes we've added and the dataset columns they
  // map to
  const [attributeToColumnMap, updateAttributeToColumnMap] = useMap<
    ConceptAttributeId,
    DatasetColumn.Id
  >();

  // these are the attributes that we've already added
  const addedColumns = useMemo(() => {
    return [...attributeToColumnMap.values()];
  }, [attributeToColumnMap]);
  const { datasetColumnAttributes: addedAttributes } = conceptForm.getValues();

  const attributeItems = useMemo(() => {
    return makeSegmentedControlItems(addedAttributes, {
      valueFn: prop("id"),
      labelFn: prop("name"),
    });
  }, [addedAttributes]);

  const addDatasetColumnAsAttribute = useCallback(() => {
    if (
      selectedDatasetColumnId &&
      datasetColumnLookup[selectedDatasetColumnId]
    ) {
      const { column: selectedDatasetColumn, dataset: selectedDataset } =
        datasetColumnLookup[selectedDatasetColumnId];

      if (selectedDatasetColumn && selectedDataset) {
        const newAttribute = makeDefaultDatasetColumnAttribute({
          conceptId,
          name: selectedDatasetColumn.name,
          dataset: selectedDataset,
          datasetColumn: selectedDatasetColumn,
        });

        // link this attribute to the dataset column it's based on
        updateAttributeToColumnMap.set(
          newAttribute.id,
          selectedDatasetColumn.id,
        );
        if (addedAttributes.length === 0) {
          // if this is the first attribute we're adding to the `attributes`
          // array, then automatically select it
          setSelectedAttributeId(newAttribute.id);
        }

        // add this attribute to the form data
        conceptForm.insertListItem("datasetColumnAttributes", newAttribute);

        // if the selected dataset isn't already in our sourceDatasets array,
        // add it
        const { sourceDatasets } = conceptForm.getValues();
        if (!sourceDatasets.some(propEq("dataset.id", selectedDataset.id))) {
          conceptForm.insertListItem("sourceDatasets", {
            dataset: selectedDataset,
            primaryKeyColumnId: undefined,
          });
        }
      }
    }
  }, [
    addedAttributes,
    conceptForm,
    conceptId,
    datasetColumnLookup,
    selectedDatasetColumnId,
    updateAttributeToColumnMap,
  ]);

  const removeAttribute = useCallback(() => {
    if (selectedAttributeId) {
      const selectedAttribute = addedAttributes.find(
        propEq("id", selectedAttributeId),
      );
      const sourceDatasetId =
        selectedAttribute?.mappings.datasetColumn.datasetId;
      const newAttributes = removeItemWhere(
        addedAttributes,
        propEq("id", selectedAttributeId),
      );
      conceptForm.setFieldValue("datasetColumnAttributes", newAttributes);
      updateAttributeToColumnMap.delete(selectedAttributeId);

      // reset the selected attribute to be the first attribute in the list
      setSelectedAttributeId(newAttributes[0]?.id);

      // if we removed an attribute, we might need to remove it from our
      // `sourceDatasets` array.
      // First, check if another attribute relies on this same dataset
      const isSourceDatasetStillUsed = newAttributes.some(
        propEq("mappings.datasetColumn.datasetId", sourceDatasetId),
      );
      if (!isSourceDatasetStillUsed && sourceDatasetId) {
        // no remaining attributes use this dataset, so we can safely remove
        // it from our `sourceDatasets` list
        const sourceDatasetIdx = conceptForm
          .getValues()
          .sourceDatasets.findIndex(propEq("dataset.id", sourceDatasetId));
        conceptForm.removeListItem("sourceDatasets", sourceDatasetIdx);
      }
    }
  }, [
    conceptForm,
    addedAttributes,
    selectedAttributeId,
    updateAttributeToColumnMap,
  ]);

  const { sourceDatasets } = conceptForm.getValues();

  return (
    <Fieldset legend={t`Fields that come from datasets`}>
      <Stack>
        <Callout.Info
          title={t`Select the columns you want in this ${conceptName}`}
          icon={<IconCircleNumber1Filled />}
        >
          <Text>
            <Trans>
              A profile can consist of columns that come from different
              datasets.
            </Trans>
          </Text>
          <Text>
            <Trans>
              This is where you select which columns from which datasets should
              be added into this {conceptName}.
            </Trans>
          </Text>
        </Callout.Info>
        <Group align="flex-start">
          <Stack gap="xs">
            <Text size="xs" c="dark" tt="uppercase" lts="0.1em">
              <Trans>Dataset columns</Trans>
            </Text>
            <Divider />
            <DatasetColumnPickerList
              datasetIds={allDatasets?.map(prop("id")) ?? []}
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
              aria-label={t`Add column as a field`}
              className={`data-[disabled]:bg-transparent`}
              disabled={!selectedDatasetColumnId}
              onClick={addDatasetColumnAsAttribute}
            >
              <IconArrowRight size={24} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="neutral"
              aria-label={t`Remove field`}
              className={`data-[disabled]:bg-transparent`}
              disabled={addedAttributes.length === 0}
              onClick={removeAttribute}
            >
              <IconArrowLeft size={24} />
            </ActionIcon>
          </Stack>
          <Stack gap="xs">
            <Text size="xs" c="dark" tt="uppercase" lts="0.1em">
              <Trans>Profile fields</Trans>
            </Text>
            <Divider />
            {addedAttributes.length === 0 ?
              <Text>
                <Trans>No columns have been added yet.</Trans>
              </Text>
            : <ScrollArea h={300}>
                <SegmentedControl
                  orientation="vertical"
                  data={attributeItems}
                  value={selectedAttributeId}
                  onChange={setSelectedAttributeId}
                />
              </ScrollArea>
            }
          </Stack>
          {selectedAttributeId ?
            <Box pt="sm">
              <DatasetColumnMappingCreator
                conceptForm={conceptForm}
                attributeIdx={addedAttributes.findIndex(
                  propEq("id", selectedAttributeId),
                )}
                attributeName={
                  addedAttributes.find(propEq("id", selectedAttributeId))!.name
                }
              />
            </Box>
          : null}
        </Group>

        <Divider my="xs" />
        {sourceDatasets.length > 1 ?
          <Callout.Info
            title={t`Configure how to join datasets`}
            icon={<IconCircleNumber2Filled />}
          >
            <Text>
              <Trans>
                For each dataset you've added, please specify which columns
                should be used to uniquely identify a {conceptName}.
              </Trans>
            </Text>
            <Text>
              <Trans>
                We will use those columns to merge datasets into a single{" "}
                {conceptName}.
              </Trans>
            </Text>
          </Callout.Info>
        : null}
        {addedAttributes.length > 0 ?
          <IdentifierBlock
            conceptForm={conceptForm}
            conceptName={conceptName}
          />
        : <Text>
            <Trans>No columns have been added yet.</Trans>
          </Text>
        }
      </Stack>
    </Fieldset>
  );
}
