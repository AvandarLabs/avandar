import { useMemo } from "react";
import { extractDatasetIdsFromDashboardConfig } from "@/clients/dashboards/extractDatasetIdsFromDashboardConfig";
import { LocalPublicDatasetRawDataClient } from "@/clients/datasets/LocalPublicDatasetRawDataClient";
import { useQuery } from "@/lib/hooks/query/useQuery";
import type { Dashboard } from "@/models/Dashboard/Dashboard.types";
import type { DatasetId } from "@/models/datasets/Dataset";

/**
 * Ensures all published dataset dependencies for a dashboard are loaded into
 * DuckDB before rendering DataViz blocks.
 */
export function useEnsurePublishedDashboardDatasets(
  dashboard: Dashboard | undefined,
): [isLoadingDatasets: boolean, error: Error | undefined] {
  const dashboardId = dashboard?.id;
  const datasetIds = useMemo(() => {
    if (dashboard?.isPublic) {
      return extractDatasetIdsFromDashboardConfig(
        dashboard.config,
      ) as readonly DatasetId[];
    }
    return [];
  }, [dashboard?.config, dashboard?.isPublic]);

  const [loadDatasetsToMemory] =
    LocalPublicDatasetRawDataClient.useLoadDatasetsToMemory();

  const [, isLoadingDatasets, loadingDatasetsQuery] = useQuery({
    queryKey: ["public-datasets", dashboardId, datasetIds],
    queryFn: async () => {
      if (!dashboardId) {
        return;
      }

      return await loadDatasetsToMemory.async({
        dashboardId,
        datasetIds,
      });
    },
    enabled: !!dashboardId && datasetIds.length > 0,
  });

  return [isLoadingDatasets, loadingDatasetsQuery.error ?? undefined];
}
