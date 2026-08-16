import { useQuery } from "@avandar/query-hooks";
import { useMemo } from "react";
import { getDatasetIdsFromDashboardConfig } from "@/clients/dashboards/getDatasetIdsFromDashboardConfig/getDatasetIdsFromDashboardConfig";
import { LocalPublicDatasetRawDataClient } from "@/clients/datasets/LocalPublicDatasetRawDataClient/LocalPublicDatasetRawDataClient";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { UseQueryResultTuple } from "@avandar/query-hooks";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type PublishedDatasetsQueryOptions = {
  dashboardId: Dashboard.Id | undefined;
  datasetIds: readonly Dataset.Id[];
  snapshotRevision: string | undefined;
  visibility: Dashboard.Visibility | undefined;
};

function _getDatasetIdsFromDashboard(
  dashboard: Readonly<Dashboard.T> | undefined,
): Dataset.Id[] {
  return dashboard && dashboard.visibility !== "draft" ?
      (getDatasetIdsFromDashboardConfig(dashboard.config) as Dataset.Id[])
    : [];
}

function usePublishedDatasetsQuery(
  options: Readonly<PublishedDatasetsQueryOptions>,
): UseQueryResultTuple<{ loadedDatasetIds: Dataset.Id[] } | undefined> {
  const { dashboardId, datasetIds, snapshotRevision, visibility } = options;
  const [loadDatasetsToMemory] =
    LocalPublicDatasetRawDataClient.useLoadDatasetsToMemory();

  return useQuery({
    queryKey: [
      "public-datasets",
      dashboardId,
      visibility,
      snapshotRevision,
      datasetIds,
    ],
    queryFn: async () => {
      if (
        !dashboardId ||
        !snapshotRevision ||
        !visibility ||
        visibility === "draft"
      ) {
        return;
      }
      return await loadDatasetsToMemory.async({
        bucket:
          SnapshotStorageUtils.getSnapshotBucketNameFromVisibility(visibility),
        dashboardId,
        datasetIds,
        snapshotRevision,
      });
    },
    enabled:
      !!dashboardId &&
      visibility !== undefined &&
      visibility !== "draft" &&
      !!snapshotRevision &&
      datasetIds.length > 0,
    staleTime: 0,
    ...ALWAYS_REFETCH_ON_MOUNT,
  });
}

/**
 * Ensures published dashboard dataset dependencies are loaded into DuckDB.
 *
 * Draft dashboards have no snapshot, so their blocks read live workspace data.
 */
export function useEnsurePublishedDashboardDatasets(
  dashboard: Readonly<Dashboard.T> | undefined,
): { isLoadingDatasets: boolean; error: Error | undefined } {
  const dashboardId = dashboard?.id;
  const visibility = dashboard?.visibility;
  const snapshotRevision = dashboard?.snapshotRevision;
  const datasetIds = useMemo(() => {
    return _getDatasetIdsFromDashboard(dashboard);
  }, [dashboard]);
  const [, , loadingDatasetsQuery] = usePublishedDatasetsQuery({
    dashboardId,
    datasetIds,
    snapshotRevision,
    visibility,
  });

  return {
    isLoadingDatasets: loadingDatasetsQuery.isFetching,
    error: loadingDatasetsQuery.error ?? undefined,
  };
}
