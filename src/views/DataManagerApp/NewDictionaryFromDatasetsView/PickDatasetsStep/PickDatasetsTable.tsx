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
  /** Datasets shown picked that cannot be unpicked. */
  lockedDatasetIds?: readonly Dataset.Id[];
  /** Why the locked datasets cannot be unpicked. */
  lockedReason?: ReactNode;
  /** Datasets shown unpicked that cannot be picked. */
  unavailableDatasetIds?: readonly Dataset.Id[];
  /** Why the unavailable datasets cannot be picked. */
  unavailableReason?: ReactNode;
  /** What to say when there is no dataset. Defaults to the create copy. */
  emptyMessage?: ReactNode;
  onToggle: (datasetId: Dataset.Id) => void;
};

/** What the table says when there is no dataset to list. */
function NoDatasetsMessage(props: Readonly<{ message: ReactNode }>): ReactNode {
  return (
    <Text size="sm" c="dimmed">
      {props.message ?? (
        <Trans>
          There are no datasets yet. Add one, then learn a dictionary from it.
        </Trans>
      )}
    </Text>
  );
}

/** Every dataset in the workspace, each with a checkbox to pick it. */
export function PickDatasetsTable({
  datasets,
  columnCounts,
  pickedDatasetIds,
  lockedDatasetIds,
  lockedReason,
  unavailableDatasetIds,
  unavailableReason,
  emptyMessage,
  onToggle,
}: Readonly<Props>): ReactNode {
  if (datasets.length === 0) {
    return <NoDatasetsMessage message={emptyMessage} />;
  }
  return (
    <Table highlightOnHover verticalSpacing="xs">
      <PickDatasetsTableHead />
      <Table.Tbody>
        {datasets.map((dataset) => {
          const isUnavailable =
            unavailableDatasetIds?.includes(dataset.id) ?? false;
          return (
            <PickDatasetRow
              key={dataset.id}
              dataset={dataset}
              columnCount={columnCounts.get(dataset.id) ?? 0}
              isPicked={pickedDatasetIds.includes(dataset.id)}
              isLocked={lockedDatasetIds?.includes(dataset.id) ?? false}
              lockedReason={lockedReason}
              unavailableReason={isUnavailable ? unavailableReason : undefined}
              onToggle={onToggle}
            />
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
