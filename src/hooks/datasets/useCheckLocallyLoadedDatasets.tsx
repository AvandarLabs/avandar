import { modals } from "@mantine/modals";
import { useEffect, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { ResyncDatasetsBlock } from "@/components/DataManagerApp/ResyncDatasetsBlock";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { Logger } from "@/lib/Logger";
import { assertIsDefined } from "@/lib/utils/asserts";
import { isEmptyArray, isNullish, or } from "@/lib/utils/guards";
import { getProp, propIs } from "@/lib/utils/objects/higherOrderFuncs";
import { promiseMap } from "@/lib/utils/promises";
import { useCurrentWorkspace } from "../workspaces/useCurrentWorkspace";

/**
 * Checks that all datasets that require locally-loaded data (e.g. datasets of
 * type `"csv_file"`) have a locally-loaded table in DuckDB.
 *
 * For all missing datasets that require local data, we will display an
 * error modal notifying the user that the data could not be found.
 *
 * In this modal, the user has the following options:
 *
 * a) Re-upload the dataset. But if they upload a dataset whose metadata
 *    (e.g. column names) is different from the stored dataset, then we
 *    do not allow this. Their only choice now is to delete the dataset.
 * b) Delete the dataset.
 *
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
        const isLoaded = await DatasetRawDataClient.isDatasetLoadedLocally({
          datasetId: dataset.id,
        });
        return { dataset, isLoaded };
      });

      return datasetStatuses
        .filter(propIs("isLoaded", false))
        .map(getProp("dataset"));
    },
  });

  useEffect(() => {
    // Do nothing if there are no missing datasets
    if (or(missingDatasets, isNullish, isEmptyArray)) {
      modals.closeAll();
      return;
    }
    if (modalId) {
      Logger.log("updating?");
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
