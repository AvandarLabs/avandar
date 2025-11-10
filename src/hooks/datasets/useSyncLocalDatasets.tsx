import { modals } from "@mantine/modals";
import { useEffect, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { ResyncDatasetsBlock } from "@/components/DataManagerApp/ResyncDatasetsBlock";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { difference } from "@/lib/utils/arrays/misc";
import { assertIsDefined } from "@/lib/utils/asserts";
import { isEmptyArray, isNullish, or } from "@/lib/utils/guards/guards";
import { prop, propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { promiseMap } from "@/lib/utils/promises";
import { UserId } from "@/models/User/types";
import { useCurrentUser } from "../users/useCurrentUser";
import { useCurrentWorkspace } from "../workspaces/useCurrentWorkspace";

/**
 * This hook handles garbage collection of local datasets. Any datasets in
 * local storage that are not listed in Supabase will be removed.
 * This runs only once: when the Supabase datasets and the local datasets are
 * first loaded.
 */
function useGarbageDatasetCollection(): void {
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();

  const [allWorkspaceDatasets] = DatasetClient.useGetAll({
    where: { workspace_id: { eq: workspace.id } },
  });

  const [localDatasets] = LocalDatasetClient.useGetAll({
    where: {
      userId: { eq: user!.id as UserId },
      workspaceId: { eq: workspace.id },
    },
    useQueryOptions: {
      enabled: !!user,
    },
  });
  const [isGarbageCollectionDone, setIsGarbageCollectionDone] = useState(false);

  useEffect(() => {
    if (isGarbageCollectionDone || !allWorkspaceDatasets || !localDatasets) {
      return;
    }
    const extraDatasetIds = difference(
      localDatasets.map(prop("datasetId")),
      allWorkspaceDatasets.map(prop("id")),
    );
    if (extraDatasetIds.length > 0) {
      LocalDatasetClient.bulkDelete({ ids: extraDatasetIds }).then(() => {
        setIsGarbageCollectionDone(true);
      });
    }
  }, [allWorkspaceDatasets, localDatasets, isGarbageCollectionDone]);
}

/**
 * Checks that all datasets that require locally-loaded data (e.g. datasets of
 * type `"csv_file"`) are available in local storage (IndexedDB).
 *
 * For all missing datasets that require local data, we will display an
 * error modal notifying the user that the data could not be found.
 *
 * In this modal, the user can either re-upload the dataset or delete it.
 *
 * TODO(jpsyx): add syncing google sheets from backend
 * TODO(jpsyx): once CSVs can be cloud-persisted, add re-downloading them
 */
export function useSyncLocalDatasets(): void {
  useGarbageDatasetCollection();
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
        .map(prop("dataset"));
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
