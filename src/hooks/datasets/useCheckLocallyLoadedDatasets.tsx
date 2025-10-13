import { modals } from "@mantine/modals";
import { useEffect, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { ResyncDatasetsBlock } from "@/components/DataManagerApp/ResyncDatasetsBlock";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { assertIsDefined } from "@/lib/utils/asserts";
import { isEmptyArray, isNullish, or } from "@/lib/utils/guards";
import { getProp, propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { promiseMap } from "@/lib/utils/promises";
import { useCurrentWorkspace } from "../workspaces/useCurrentWorkspace";

/**
 * Checks that all datasets that require locally-loaded data (e.g. datasets of
 * type `"csv_file"`) are available in local storage (IndexedDB).
 *
 * For all missing datasets that require local data, we will display an
 * error modal notifying the user that the data could not be found.
 *
 * In this modal, the user can either re-upload the dataset or delete it.
 */
export function useCheckLocallyLoadedDatasets(): void {
  const workspace = useCurrentWorkspace();
  const [modalId, setModalId] = useState<string | undefined>(undefined);
  const [datasets] = DatasetClient.useGetAll({
    where: {
      workspace_id: { eq: workspace.id },
      source_type: { eq: "csv_file" },
    },
  });

  // TODO(jpsyx): this should be a DatasetClient query
  const [missingDatasets] = useQuery({
    enabled: !!datasets,
    usePreviousDataAsPlaceholder: true,
    queryKey: ["missing-datasets", datasets],
    queryFn: async () => {
      assertIsDefined(datasets);

      // get the locally loaded datasets
      const datasetStatuses = await promiseMap(datasets, async (dataset) => {
        const isLoaded = await DatasetRawDataClient.isLocalDatasetAvailable({
          datasetId: dataset.id,
        });
        return { dataset, isLoaded };
      });

      return datasetStatuses
        .filter(propEq("isLoaded", false))
        .map(getProp("dataset"));
    },
  });

  useEffect(() => {
    // Do nothing if there are no missing datasets
    if (or(missingDatasets, isNullish, isEmptyArray)) {
      modals.closeAll();
      setModalId(undefined);
      return;
    }
    if (modalId) {
      modals.updateModal({
        modalId: modalId,
        children: <ResyncDatasetsBlock datasets={missingDatasets} />,
      });
    } else {
      setModalId(
        modals.open({
          title: "Some datasets are missing data",
          withCloseButton: false,
          closeOnClickOutside: false,
          closeOnEscape: false,
          children: <ResyncDatasetsBlock datasets={missingDatasets} />,
        }),
      );
    }
  }, [missingDatasets, modalId]);
}
