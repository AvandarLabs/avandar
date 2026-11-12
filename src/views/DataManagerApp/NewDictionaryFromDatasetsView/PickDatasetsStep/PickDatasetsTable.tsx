import { Trans } from "@lingui/react/macro";
import { Table, Text } from "@mantine/core";
import { PickDatasetRow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetRow";
import { PickDatasetsTableHead } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsTableHead";
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
      <PickDatasetsTableHead />
      <Table.Tbody>
        {datasets.map((dataset) => {
          return (
            <PickDatasetRow
              key={dataset.id}
              dataset={dataset}
              columnCount={columnCounts.get(dataset.id) ?? 0}
              isPicked={pickedDatasetIds.includes(dataset.id)}
              onToggle={onToggle}
            />
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
