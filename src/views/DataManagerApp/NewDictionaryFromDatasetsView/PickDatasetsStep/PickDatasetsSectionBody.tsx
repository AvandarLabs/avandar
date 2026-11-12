import { Trans } from "@lingui/react/macro";
import { Center, Loader, Text } from "@mantine/core";
import { PickDatasetsTable } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsTable";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  datasets: readonly Dataset.T[];
  columnCounts: ReadonlyMap<Dataset.Id, number>;
  pickedDatasetIds: readonly Dataset.Id[];
  isLoading: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
};

/** What the Pick step's section holds: a line of help, then the datasets. */
export function PickDatasetsSectionBody({
  datasets,
  columnCounts,
  pickedDatasetIds,
  isLoading,
  dispatch,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <Text size="sm" c="dimmed" mb="sm">
        <Trans>
          Pick datasets that use the same codes. Avandar reads each column,
          finds the coded ones, and merges columns that mean the same thing.
        </Trans>
      </Text>
      {isLoading ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : (
        <PickDatasetsTable
          datasets={datasets}
          columnCounts={columnCounts}
          pickedDatasetIds={pickedDatasetIds}
          onToggle={(datasetId) => {
            dispatch({ type: "toggle_dataset", datasetId });
          }}
        />
      )}
    </>
  );
}
