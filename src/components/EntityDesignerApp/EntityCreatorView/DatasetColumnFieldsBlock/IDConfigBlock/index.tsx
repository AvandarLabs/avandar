import { Box, Group, Loader, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { Select } from "@/lib/ui/inputs/Select";
import { makeSelectOptions } from "@/lib/ui/inputs/Select/makeSelectOptions";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isNotUndefined } from "@/lib/utils/guards";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { EntityConfigFormType } from "../../entityConfigFormTypes";

type Props = {
  entityConfigForm: EntityConfigFormType;
  entityConfigName: string;
};

export function IDConfigBlock({
  entityConfigForm,
  entityConfigName,
}: Props): JSX.Element {
  const { datasetColumnFields, sourceDatasets } = entityConfigForm.getValues();

  const datasetIdsToPullFrom = useMemo(() => {
    return [
      ...new Set(
        datasetColumnFields
          .map(getProp("extractors.datasetColumnValue.datasetId"))
          .filter(isNotUndefined),
      ),
    ];
  }, [datasetColumnFields]);

  const [localDatasets, loadingLocalDatasets] = LocalDatasetClient.useGetAll({
    ...where("id", "in", datasetIdsToPullFrom),
    useQueryOptions: { enabled: datasetIdsToPullFrom.length > 0 },
  });

  const fieldOptionsByDatasetId = useMemo(() => {
    return makeObjectFromList(localDatasets ?? [], {
      keyFn: getProp("id"),
      valueFn: (dataset) => {
        return makeSelectOptions(dataset.fields, {
          valueFn: getProp("id"),
          labelFn: getProp("name"),
        });
      },
    });
  }, [localDatasets]);

  if (loadingLocalDatasets) return <Loader />;

  // single dataset: keep the clear instructional sentence + one select
  if (sourceDatasets.length <= 1) {
    const sourcedDataset = sourceDatasets[0]?.dataset;
    const fieldOptions =
      sourcedDataset ? (fieldOptionsByDatasetId[sourcedDataset.id] ?? []) : [];
    return (
      <Stack>
        <Text>
          For dataset{" "}
          <Text span fw="bold">
            {sourcedDataset?.name}
          </Text>
          , choose the field to use as the {entityConfigName} ID
        </Text>
        <Select
          required
          data={fieldOptions}
          placeholder="Select a field"
          size="lg"
          radius="md"
          {...entityConfigForm.getInputProps(
            `sourceDatasets.0.primaryKeyColumnId`,
          )}
        />
      </Stack>
    );
  }

  // two or more datasets: show simplified “A = B” row for the first two
  const left = sourceDatasets[0]!.dataset;
  const right = sourceDatasets[1]!.dataset;

  const leftOptions = fieldOptionsByDatasetId[left.id] ?? [];
  const rightOptions = fieldOptionsByDatasetId[right.id] ?? [];

  return (
    <Stack gap="sm">
      <Text size="sm">
        We should join data into the same {entityConfigName} when…
      </Text>

      <Group justify="center" gap="xl" wrap="nowrap">
        <Box ta="center" style={{ minWidth: 240 }}>
          <Text size="sm" c="dimmed" mb={6}>
            {left.name}
          </Text>
          <Select
            required
            data={leftOptions}
            placeholder="Select field"
            size="lg"
            radius="md"
            styles={{
              input: { height: 56, textAlign: "center", fontWeight: 600 },
            }}
            {...entityConfigForm.getInputProps(
              `sourceDatasets.0.primaryKeyColumnId`,
            )}
          />
        </Box>

        <Text fw={700} size="lg" aria-hidden>
          =
        </Text>

        <Box ta="center" style={{ minWidth: 240 }}>
          <Text size="sm" c="dimmed" mb={6}>
            {right.name}
          </Text>
          <Select
            required
            data={rightOptions}
            placeholder="Select field"
            size="lg"
            radius="md"
            styles={{
              input: { height: 56, textAlign: "center", fontWeight: 600 },
            }}
            {...entityConfigForm.getInputProps(
              `sourceDatasets.1.primaryKeyColumnId`,
            )}
          />
        </Box>
      </Group>
    </Stack>
  );
}
