import {
  ActionIcon,
  Box,
  Button,
  Fieldset,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { LocalDatasetColumnPickerList } from "@/components/common/LocalDatasetColumnPickerList";
import { LocalDatasetSelect } from "@/components/common/LocalDatasetSelect";
import { FormType } from "@/lib/hooks/ui/useForm";
import { useMap } from "@/lib/hooks/useMap";
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
  EntityConfigFormValues,
  getDefaultEntityFieldFormValues,
} from "./entityCreatorTypes";
import { EntityFieldCreator } from "./EntityFieldCreator";

type Props = {
  entityConfigForm: FormType<EntityConfigFormValues>;
  entityConfigId: EntityConfigId;
  entityConfigName: string;
};

export function EntityFieldCreatorBlock({
  entityConfigForm,
  entityConfigId,
  entityConfigName,
}: Props): JSX.Element {
  const { fields } = entityConfigForm.getValues();
  const [selectedDatasetId, setSelectedDatasetId] =
    useState<LocalDatasetId | null>(null);

  const [selectedDatasetColumnId, setSelectedDatasetColumnId] = useState<
    LocalDatasetFieldId | undefined
  >();

  const [selectedDataset] = LocalDatasetClient.useGetById({
    id: selectedDatasetId,
    useQueryOptions: { enabled: !!selectedDatasetId },
  });

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

  const fieldRows = fields.map((field, idx) => {
    return (
      <EntityFieldCreator
        key={field.id}
        defaultField={field}
        entityConfigForm={entityConfigForm}
        idx={idx}
        entityName={entityConfigName}
      />
    );
  });

  const fieldItems = useMemo(() => {
    return makeSegmentedControlItems(fields, {
      valueFn: getProp("id"),
      labelFn: getProp("name"),
    });
  }, [fields]);

  const addDatasetColumnAsField = useCallback(() => {
    if (selectedDataset && selectedDatasetColumnId) {
      const datasetColumn = selectedDataset.fields.find(
        propEquals("id", selectedDatasetColumnId),
      );

      const newField = getDefaultEntityFieldFormValues({
        entityConfigId,
        name: datasetColumn?.name ?? "New field",
        isIdField: false,
        isTitleField: false,
      });

      updateFieldToColumnMap.set(newField.id, selectedDatasetColumnId);
      if (fields.length === 0) {
        // if this is the first field we're adding to the `fields` array,
        // then automatically select it
        setSelectedFieldId(newField.id);
      }
      entityConfigForm.insertListItem("fields", newField);
    }
  }, [
    fields,
    entityConfigForm,
    entityConfigId,
    selectedDataset,
    selectedDatasetColumnId,
  ]);

  const removeField = useCallback(() => {
    if (selectedFieldId) {
      const newFields = removeItemWhere(
        fields,
        propEquals("id", selectedFieldId),
      );
      entityConfigForm.setFieldValue("fields", newFields);
      updateFieldToColumnMap.delete(selectedFieldId);

      // reset the selected field to be the first field in the list
      setSelectedFieldId(newFields[0]?.id);
    }
  }, [entityConfigForm, fields, selectedFieldId]);

  return (
    <Box>
      <Group pb="sm">
        <LocalDatasetSelect onChange={setSelectedDatasetId} />
      </Group>
      <Group>
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
        <Stack gap="xxxs">
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
            disabled={fields.length === 0}
            onClick={removeField}
          >
            <IconArrowLeft size={24} />
          </ActionIcon>
        </Stack>
        <Stack gap="xs">
          <Text size="xs" c="dark" tt="uppercase" lts="0.1em">
            Profile fields
          </Text>
          {fields.length === 0 ?
            <Text>No dataset columns have been added as fields yet</Text>
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
        <Box>Field Editor</Box>
      </Group>

      <Fieldset legend="Fields">
        <Stack>
          {entityConfigForm.errors.fields ?
            <Text c="danger">{entityConfigForm.errors.fields}</Text>
          : <>{fieldRows}</>}
          <Button
            onClick={() => {
              entityConfigForm.insertListItem(
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
    </Box>
  );
}
