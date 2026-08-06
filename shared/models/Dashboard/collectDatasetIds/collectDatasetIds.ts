import type { Dashboard } from "$/models/Dashboard/Dashboard.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

/**
 * Returns dataset ids referenced in dashboard config (SQL in viz blocks),
 * scoped
 * to ids known to belong to the workspace.
 */
export function collectDatasetIds(
  dashboard: Dashboard.T,
  workspaceDatasetIds: readonly Dataset.Id[],
): Dataset.Id[] {
  const configText = JSON.stringify(dashboard.config ?? {});
  return workspaceDatasetIds.filter((datasetId) => {
    return configText.includes(datasetId);
  });
}
