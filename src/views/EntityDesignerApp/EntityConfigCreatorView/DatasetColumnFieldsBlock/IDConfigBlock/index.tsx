import { makeSelectOptions, Select } from "@avandar/ui";
import { isDefined, makeObject, prop, where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Box, Group, Loader, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import type { EntityConfigFormType } from "@/views/EntityDesignerApp/EntityConfigCreatorView/entityConfigFormTypes";

type Props = {
  entityConfigForm: EntityConfigFormType;
  entityConfigName: string;
};

export function IDConfigBlock({
  entityConfigForm,
  entityConfigName,
}: Props): JSX.Element {
  const { t } = useLingui();
  const { datasetColumnFields, sourceDatasets } = entityConfigForm.getValues();

  const datasetIdsToPullFrom = useMemo(() => {
    return [
      ...new Set(
        datasetColumnFields
          .map(prop("extractors.datasetColumnValue.datasetId"))
          .filter(isDefined),
      ),
    ];
  }, [datasetColumnFields]);

  const [datasets, isLoadingDatasets] =
    DatasetClient.useGetAllDatasetsWithColumns({
      ...where("id", "in", datasetIdsToPullFrom),
      useQueryOptions: { enabled: datasetIdsToPullFrom.length > 0 },
    });

  const fieldOptionsByDatasetId = useMemo(() => {
    return makeObject(datasets ?? [], {
      keyFn: prop("id"),
      valueFn: (dataset) => {
        return makeSelectOptions(dataset.columns, {
          valueFn: prop("id"),
          labelFn: prop("name"),
        });
      },
    });
  }, [datasets]);

  if (isLoadingDatasets) {
    return <Loader />;
  }

  // single dataset: keep the clear instructional sentence + one select
  if (sourceDatasets.length <= 1) {
    const sourcedDataset = sourceDatasets[0]?.dataset;
    const fieldOptions =
      sourcedDataset ? (fieldOptionsByDatasetId[sourcedDataset.id] ?? []) : [];
    return (
      <Stack>
        <Text>
          <Trans>
            For dataset{" "}
            <Text span fw="bold">
              {sourcedDataset?.name}
            </Text>
            , choose the column to use as the {entityConfigName} ID
          </Trans>
        </Text>
        <Select
          required
          data={fieldOptions}
          placeholder={t`Select a field`}
          radius="md"
          {...entityConfigForm.getInputProps(
            `sourceDatasets.0.primaryKeyColumnId`,
          )}
        />
      </Stack>
    );
  }

  if (sourceDatasets.length === 2) {
    // two datasets: show simplified “A = B” row for the first two
    const left = sourceDatasets[0]!.dataset;
    const right = sourceDatasets[1]!.dataset;

    const leftOptions = fieldOptionsByDatasetId[left.id] ?? [];
    const rightOptions = fieldOptionsByDatasetId[right.id] ?? [];

    return (
      <Stack gap="sm">
        <Text size="sm">
          <Trans>
            We should join data into the same {entityConfigName} when…
          </Trans>
        </Text>

        <Group justify="center" gap="xl" wrap="nowrap">
          <Box ta="center" style={{ minWidth: 240 }}>
            <Select
              required
              label={left.name}
              data={leftOptions}
              placeholder={t`Select column`}
              size="md"
              classNames={{
                label: "text-dimmed text-sm text-neutral-500",
                input: "text-center font-semibold",
              }}
              {...entityConfigForm.getInputProps(
                "sourceDatasets.0.primaryKeyColumnId",
              )}
            />
          </Box>

          <Text fw={700} size="lg" aria-hidden>
            =
          </Text>

          <Box ta="center" style={{ minWidth: 240 }}>
            <Select
              required
              data={rightOptions}
              placeholder={t`Select column`}
              size="md"
              label={right.name}
              classNames={{
                label: "text-dimmed text-sm text-neutral-500",
                input: "text-center font-semibold",
              }}
              {...entityConfigForm.getInputProps(
                "sourceDatasets.1.primaryKeyColumnId",
              )}
            />
          </Box>
        </Group>
      </Stack>
    );
  }

  // 3 or more datasets:

  return (
    <Stack gap="sm">
      <Text size="sm">
        <Trans>
          We should join data into the same {entityConfigName} when…
        </Trans>
      </Text>

      {sourceDatasets.map(({ dataset }, idx) => {
        const fieldOptions = fieldOptionsByDatasetId[dataset.id] ?? [];
        return (
          <Stack>
            <Select
              required
              label={dataset.name}
              data={fieldOptions}
              placeholder={t`Select column`}
              size="md"
              classNames={{
                label: "text-dimmed text-sm text-neutral-500",
                input: "font-semibold",
              }}
              {...entityConfigForm.getInputProps(
                `sourceDatasets.${idx}.primaryKeyColumnId`,
              )}
            />
            {idx !== sourceDatasets.length - 1 ?
              <Text fw={500} size="lg" aria-hidden>
                {idx > 0 ?
                  <Trans>and is also equal to...</Trans>
                : <Trans>is equal to...</Trans>}
              </Text>
            : null}
          </Stack>
        );
      })}
    </Stack>
  );
}
