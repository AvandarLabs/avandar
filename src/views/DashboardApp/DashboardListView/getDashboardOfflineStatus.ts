import { collectDatasetIds } from "$/models/Dashboard/collectDatasetIds/collectDatasetIds";
import type { DashboardOfflineStatus } from "@/views/DashboardApp/DashboardListView/DashboardCard/DashboardCard";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * How much of a dashboard can be opened with no network.
 *
 * A dashboard that references no dataset at all is `"full"`: there is nothing
 * left to download, so it opens offline exactly as it does online.
 *
 * @param options.workspaceDatasetIds Every dataset in the workspace, used to
 *   resolve which of them the dashboard actually reads.
 * @param options.localDatasetIds The datasets whose parquet is already cached
 *   for the current user in this workspace.
 */
export function getDashboardOfflineStatus(
  options: Readonly<{
    dashboard: Dashboard.T;
    workspaceDatasetIds: readonly Dataset.Id[];
    localDatasetIds: ReadonlySet<Dataset.Id>;
  }>,
): DashboardOfflineStatus {
  const { dashboard, workspaceDatasetIds, localDatasetIds } = options;

  const referencedIds = collectDatasetIds(dashboard, workspaceDatasetIds);
  if (referencedIds.length === 0) {
    return "full";
  }

  const cachedCount = referencedIds.filter((datasetId) => {
    return localDatasetIds.has(datasetId);
  }).length;

  if (cachedCount === referencedIds.length) {
    return "full";
  }
  return cachedCount === 0 ? "none" : "partial";
}
