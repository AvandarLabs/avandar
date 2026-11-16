import { useEffect, useRef } from "react";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { refreshPlacesDatasetCaches } from "@/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Re-reads each places dataset a map shows, once per map open. A teammate's
 * edit rewrites `raw_sql` but cannot clear this browser's cached copy, so
 * without this the map would keep showing the places as they were. Cheap:
 * a places dataset is at most 500 rows of SQL. The refresh goes through
 * `AvaQueryClient`, the client QETL caches `raw_sql` in. Used only by
 * `usePlaceTool`.
 */
export function useRefreshPlacesOnMapOpen(
  options: Readonly<{
    placesLayerDatasetIds: readonly Dataset.Id[];
    userId: User.Id | undefined;
    workspaceId: Workspace.Id;
  }>,
): void {
  const refreshedIdsRef = useRef(new Set<Dataset.Id>());
  const { userId, workspaceId } = options;
  const datasetIdsKey = options.placesLayerDatasetIds.join(",");
  useEffect(
    function refreshEachPlacesDatasetOnce() {
      if (!userId || datasetIdsKey === "") {
        return;
      }
      const idsToRefresh = (datasetIdsKey.split(",") as Dataset.Id[]).filter(
        (datasetId) => {
          return !refreshedIdsRef.current.has(datasetId);
        },
      );
      idsToRefresh.forEach((datasetId) => {
        refreshedIdsRef.current.add(datasetId);
        void refreshPlacesDatasetCaches({
          queryClient: AvaQueryClient,
          datasetId,
          userId,
          workspaceId,
        });
      });
    },
    [datasetIdsKey, userId, workspaceId],
  );
}
