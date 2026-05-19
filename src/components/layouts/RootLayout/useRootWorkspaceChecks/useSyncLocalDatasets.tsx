import { useQuery } from "@hooks";
import { modals } from "@mantine/modals";
import { assertIsDefined, isNullish, prop, propEq } from "@utils";
import { UserId } from "$/models/User/User.types";
import { useEffect, useRef, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { ImportJobsManager } from "@/clients/datasets/ImportJobsManager";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { difference } from "@/lib/utils/arrays/difference/difference";
import { isEmptyArray, or } from "@/lib/utils/guards/guards";
import { promiseMap } from "@/lib/utils/promises";
import { ResyncDatasetsBlock } from "@/views/DataManagerApp/ResyncDatasetsBlock/ResyncDatasetsBlock";

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
 * Resumes any LocalDataset rows whose Phase B transcode was interrupted
 * by the previous tab session. Rows with `parseStatus === "parsing"` and
 * `sourceBytes` cached can be re-driven automatically; rows without
 * cached bytes fall through to the existing missing-dataset modal which
 * already prompts the user to re-upload.
 *
 * Runs once per workspace mount. Each in-flight job is started in the
 * background — we don't await them so the workspace bootstrap stays
 * snappy.
 */
function useResumeInFlightImports(): void {
  const didRunRef = useRef(false);
  useEffect(() => {
    if (didRunRef.current) {
      return;
    }
    didRunRef.current = true;

    (async () => {
      const parsingRows = await AvaDexie.DB.LocalDataset.where("parseStatus")
        .equals("parsing")
        .toArray();
      for (const row of parsingRows) {
        // The ImportJobsManager is process-local so a fresh load always
        // starts with an empty map. If the row had cached source bytes,
        // fire and forget — `resumeImport` registers the job, runs Phase
        // B, and updates the row.
        if (row.sourceBytes) {
          void LocalDatasetClient.resumeImport({ datasetId: row.datasetId });
        }
        // Rows without cached bytes are surfaced as "missing data"
        // entries by `useSyncLocalDatasets` below, which already shows a
        // re-upload affordance via `ResyncDatasetsBlock`.
      }
    })();
  }, []);
}

/**
 * Checks that all datasets that require locally-loaded data (i.e. datasets of
 * type `"csv_file"` or `"xlsx_file"`) are available in local storage
 * (IndexedDB).
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
  useResumeInFlightImports();
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const [modalId, setModalId] = useState<string | undefined>(undefined);

  // get all datasets that are available to this user and require locally
  // loaded data (i.e. csv_file or xlsx_file).
  const [datasets] = DatasetClient.useGetAll({
    where: {
      workspace_id: { eq: workspace.id },
      source_type: { in: ["csv_file", "xlsx_file"] },
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
        const isInLocalStorage = await LocalDatasetClient.getById({
          id: dataset.id,
        });

        // A row in `parseStatus="parsing"` with cached source bytes will
        // resume in the background (see `useResumeInFlightImports`), so
        // we don't surface it as missing. A row that's parsing but has
        // no cached source bytes — or has `failed` outright — is treated
        // as missing so the existing re-upload affordance kicks in.
        if (isInLocalStorage) {
          if (isInLocalStorage.parseStatus === "ready") {
            return { dataset, isLoaded: true };
          }
          if (
            isInLocalStorage.parseStatus === "parsing" &&
            isInLocalStorage.sourceBytes
          ) {
            return { dataset, isLoaded: true };
          }
          // parsing-without-bytes, or failed — fall through to the
          // re-upload flow.
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
