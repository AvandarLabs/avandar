import { isNonEmptyArray, prop, where } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Accordion, Badge, Group, Stack, Text, Title } from "@mantine/core";
import { IconDatabase, IconShieldLock } from "@tabler/icons-react";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { useMemo } from "react";
import { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import { getDatasetIdsFromDashboardConfig } from "@/clients/dashboards/getDatasetIdsFromDashboardConfig/getDatasetIdsFromDashboardConfig";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import { SliceModeEditor } from "@/views/DashboardApp/DashboardShareModal/SliceModeEditor";
import type { PublishSliceDataset } from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection/PublishSliceSection.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T;
  publishConfig: PublishSliceConfig.Dashboard;
  onChange: (publishConfig: PublishSliceConfig.Dashboard) => void;
};

/** Selects the data published for each dataset used by a dashboard. */
export function PublishSliceSection({
  dashboard,
  publishConfig,
  onChange,
}: Props): ReactNode {
  const workspace = useCurrentWorkspace();
  const datasetIdsFromConfig = useMemo(() => {
    return getDatasetIdsFromDashboardConfig(dashboard.config) as Dataset.Id[];
  }, [dashboard.config]);
  const [datasets] = DatasetClient.useGetAll({
    where: {
      id: { in: datasetIdsFromConfig },
      workspace_id: { eq: workspace.id },
    },
    useQueryOptions: { enabled: isNonEmptyArray(datasetIdsFromConfig) },
  });
  const datasetIds = useMemo(() => {
    return (datasets ?? []).map(prop("id"));
  }, [datasets]);
  const [datasetColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "in", datasetIds),
    useQueryOptions: { enabled: isNonEmptyArray(datasetIds) },
  });
  const referencedColumns = useMemo(() => {
    return DashboardSliceBuilder.extractReferencedColumns({
      dashboardConfig: dashboard.config,
      allDatasetIds: datasetIds,
    });
  }, [dashboard.config, datasetIds]);
  const publishSliceDatasets: readonly PublishSliceDataset[] = useMemo(() => {
    if (!datasets) {
      return [];
    }
    return datasets.map((dataset) => {
      const columns = (datasetColumns ?? []).filter((column) => {
        return column.datasetId === dataset.id;
      });
      return {
        id: dataset.id,
        name: dataset.name,
        columns,
        queriedColumns: Array.from(
          referencedColumns.perDataset[dataset.id] ?? [],
        ),
        treatAsAllColumns: referencedColumns.unparseable.has(dataset.id),
      };
    });
  }, [datasets, datasetColumns, referencedColumns]);

  if (datasetIdsFromConfig.length === 0) {
    return (
      <Stack gap={4}>
        <Title order={5} fw={600}>
          <Trans>Data scope</Trans>
        </Title>
        <Text size="xs" c="dimmed">
          <Trans>
            This dashboard doesn't reference any datasets: nothing to publish.
          </Trans>
        </Text>
      </Stack>
    );
  }

  const updateSlice = (
    datasetId: Dataset.Id,
    slice: PublishSliceConfig.T,
  ): void => {
    onChange({ slices: { ...publishConfig.slices, [datasetId]: slice } });
  };

  return (
    <Stack gap="xs">
      <Group gap={6} align="center">
        <IconShieldLock size={16} color="var(--mantine-color-blue-7)" />
        <Title order={5} fw={600}>
          <Trans>Data scope</Trans>
        </Title>
      </Group>
      <Text size="xs" c="dimmed">
        <Trans>
          Choose how much of each dataset to publish. The default: "Only what's
          queried": uploads just the columns your visualizations read. Widen the
          scope if you've added viewer-editable filters and want viewers to be
          able to filter beyond your defaults.
        </Trans>
      </Text>
      <Accordion variant="separated" multiple defaultValue={[]}>
        {publishSliceDatasets.map((dataset) => {
          const slice =
            publishConfig.slices[dataset.id] ?? PublishSliceConfig.DEFAULT;
          return (
            <Accordion.Item key={dataset.id} value={dataset.id}>
              <Accordion.Control icon={<IconDatabase size={16} />}>
                <Group gap="sm" wrap="nowrap">
                  <Text fw={500} size="sm">
                    {dataset.name}
                  </Text>
                  <Badge
                    size="xs"
                    variant="light"
                    color={
                      slice.mode === "queried" ? "teal"
                      : slice.mode === "all_columns" ?
                        "yellow"
                      : "blue"
                    }
                  >
                    {slice.mode === "queried" ?
                      <Trans>Narrowest</Trans>
                    : slice.mode === "all_columns" ?
                      <Trans>All columns</Trans>
                    : <Trans>Custom</Trans>}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <SliceModeEditor
                  dataset={dataset}
                  slice={slice}
                  onChange={(updatedSlice) => {
                    updateSlice(dataset.id, updatedSlice);
                  }}
                />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
}
