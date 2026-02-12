import { modals } from "@mantine/modals";
import { isNullish } from "$/lib/utils/guards/isNullish/isNullish";
import { useEffect, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { ResyncDatasetsBlock } from "@/components/DataManagerApp/ResyncDatasetsBlock";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { difference } from "@/lib/utils/arrays/difference";
import { assertIsDefined } from "@/lib/utils/asserts";
import { isEmptyArray, or } from "@/lib/utils/guards/guards";
import { prop, propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { promiseMap } from "@/lib/utils/promises";
import { UserId } from "@/models/User/User.types";
import { useCurrentUser } from "../../../hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "../../../hooks/workspaces/useCurrentWorkspace";

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
 */
export function useSyncLocalDatasets(): void {
  useGarbageDatasetCollection();
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const [modalId, setModalId] = useState<string | undefined>(undefined);

  // get all datasets that are available to this user and are of type "csv_file"
  const [datasets] = DatasetClient.useGetAll({
    where: {
      workspace_id: { eq: workspace.id },
      source_type: { eq: "csv_file" },
    },
  });

  // TODO(jpsyx): this should be a DatasetClient query
  const [missingDatasets] = useQuery({
    enabled: !!datasets && !!user,
    usePreviousDataAsPlaceholder: true,
    queryKey: ["missing-datasets", datasets, user],
    queryFn: async () => {
      assertIsDefined(datasets);
      assertIsDefined(user);

      // get the locally loaded datasets
      const datasetStatuses = await promiseMap(datasets, async (dataset) => {
        const isLoaded = await DatasetRawDataClient.isLocalDatasetAvailable({
          datasetId: dataset.id,
        });

        if (isLoaded) {
          return { dataset, isLoaded };
        }

        // if not in our local storage, then fetch it from cloud object storage
        // and store it in IndexedDB.
        try {
          await LocalDatasetClient.fetchCloudDatasetToLocalStorage({
            datasetId: dataset.id,
            workspaceId: workspace.id,
            userId: user.id as UserId,
          });

          return { dataset, isLoaded: true };
        } catch {
          return { dataset, isLoaded: false };
        }
      });

      return datasetStatuses
        .filter(propEq("isLoaded", false))
        .map(prop("dataset"));
    },
  });

  useEffect(() => {
    // we use queue microtask to ensure that the Mantine ModalsProvider is
    // ready before opening a modal
    queueMicrotask(() => {
      if (or(missingDatasets, isNullish, isEmptyArray)) {
        if (modalId) {
          modals.closeAll();
        }
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
    });
  }, [missingDatasets, modalId]);
}
