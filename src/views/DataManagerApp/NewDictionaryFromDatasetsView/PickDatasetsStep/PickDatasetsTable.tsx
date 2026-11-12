import { Trans, useLingui } from "@lingui/react/macro";
import { Checkbox, Group, Table, Text, VisuallyHidden } from "@mantine/core";
import { useDatasetSourceLabels } from "@/hooks/datasets/useDatasetSourceLabels";
import { DatasetSourceIcon } from "@/views/DataManagerApp/DatasetSourceIcon";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasets: readonly Dataset.T[];
  columnCounts: ReadonlyMap<Dataset.Id, number>;
  pickedDatasetIds: readonly Dataset.Id[];
  onToggle: (datasetId: Dataset.Id) => void;
};

/** Every dataset in the workspace, each with a checkbox to pick it. */
export function PickDatasetsTable({
  datasets,
  columnCounts,
  pickedDatasetIds,
  onToggle,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const sourceLabels = useDatasetSourceLabels();

  if (datasets.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        <Trans>
          There are no datasets yet. Add one, then learn a dictionary from it.
        </Trans>
      </Text>
    );
  }
  return (
    <Table highlightOnHover verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={44}>
            <VisuallyHidden>
              <Trans>Pick</Trans>
            </VisuallyHidden>
          </Table.Th>
          <Table.Th>
            <Trans>Dataset</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Source</Trans>
          </Table.Th>
          <Table.Th ta="right">
            <Trans>Columns</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {datasets.map((dataset) => {
          const datasetName = dataset.name;
          return (
            <Table.Tr key={dataset.id}>
              <Table.Td>
                <Checkbox
                  aria-label={t`Pick ${datasetName}`}
                  checked={pickedDatasetIds.includes(dataset.id)}
                  onChange={() => {
                    onToggle(dataset.id);
                  }}
                />
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {datasetName}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  <DatasetSourceIcon sourceType={dataset.sourceType} />
                  <Text size="sm">{sourceLabels[dataset.sourceType]}</Text>
                </Group>
              </Table.Td>
              <Table.Td ta="right">
                <Text size="sm">{columnCounts.get(dataset.id) ?? 0}</Text>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
