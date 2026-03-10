import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

export const WORKSPACES_BUCKET_NAME = "workspaces" as const;
export const DIRECT_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;

export function getDatasetParquetStoragePath(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
}): string {
  const { workspaceId, datasetId } = options;

  return `${workspaceId}/datasets/${datasetId}.parquet`;
}
