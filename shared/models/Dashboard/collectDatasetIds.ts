import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

/**
 * Returns dataset ids referenced in dashboard config (SQL in viz blocks), scoped
 * to ids known to belong to the workspace.
 */
export function collectDatasetIds(
  dashboard: Dashboard.T,
  workspaceDatasetIds: readonly DatasetId[],
): DatasetId[] {
  const configText = JSON.stringify(dashboard.config ?? {});
  return workspaceDatasetIds.filter((datasetId) => {
    return configText.includes(datasetId);
  });
}
