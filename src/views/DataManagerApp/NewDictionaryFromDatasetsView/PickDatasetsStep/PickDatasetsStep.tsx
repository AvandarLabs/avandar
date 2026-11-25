import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { PickDatasetsFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsFooter";
import { PickDatasetsSectionBody } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsSectionBody";
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

function _sumColumns(
  datasetIds: readonly Dataset.Id[],
  columnCounts: ReadonlyMap<Dataset.Id, number>,
): number {
  return datasetIds.reduce((sum, datasetId) => {
    return sum + (columnCounts.get(datasetId) ?? 0);
  }, 0);
}

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
  const { t, i18n } = useLingui();
  const pickedCount = pickedDatasetIds.length;
  const pickedText = i18n.number(pickedCount);
  const columnText = plural(_sumColumns(pickedDatasetIds, columnCounts), {
    one: "# column",
    other: "# columns",
  });

  return (
    <>
      <AppViewBody>
        <AppViewSection
          title={t`Datasets to learn from`}
          meta={t`${pickedText} picked · ${columnText}`}
        >
          <PickDatasetsSectionBody
            datasets={datasets}
            columnCounts={columnCounts}
            pickedDatasetIds={pickedDatasetIds}
            isLoading={isLoading}
            dispatch={dispatch}
          />
        </AppViewSection>
      </AppViewBody>
      <PickDatasetsFooter
        pickedCount={pickedCount}
        isReading={isReading}
        onRead={onRead}
      />
    </>
  );
}
