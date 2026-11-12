import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Button, Center, Loader, Text } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import { PickDatasetsTable } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsTable";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  datasets: readonly Dataset.T[];
  columnCounts: ReadonlyMap<Dataset.Id, number>;
  pickedDatasetIds: readonly Dataset.Id[];
  isLoading: boolean;
  isReading: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
  onRead: () => void;
};

/**
 * The first step of learning a dictionary: pick the datasets to learn
 * from, then read them on this device. The footer says what is read, since
 * suggestions may send some of it to a model.
 */
export function PickDatasetsStep({
  datasets,
  columnCounts,
  pickedDatasetIds,
  isLoading,
  isReading,
  dispatch,
  onRead,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const pickedCount = pickedDatasetIds.length;
  const columnCount = pickedDatasetIds.reduce((sum, datasetId) => {
    return sum + (columnCounts.get(datasetId) ?? 0);
  }, 0);

  return (
    <AppViewBody>
      <AppViewSection
        title={t`Datasets to learn from`}
        meta={t`${pickedCount} picked · ${plural(columnCount, {
          one: "# column",
          other: "# columns",
        })}`}
      >
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
      </AppViewSection>
      <NewDictionaryFooter
        start={
          <Text size="sm" c="dimmed">
            <Trans>
              Only column names and the distinct values of short columns are
              read. Rows never leave this device for suggestions.
            </Trans>
          </Text>
        }
      >
        <Button
          onClick={onRead}
          loading={isReading}
          disabled={pickedCount === 0}
        >
          <Plural
            value={pickedCount}
            one="Read # dataset"
            other="Read # datasets"
          />
        </Button>
      </NewDictionaryFooter>
    </AppViewBody>
  );
}
