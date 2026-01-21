import { DatasetId } from "@/models/datasets/Dataset";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";

export const WORKSPACES_BUCKET_NAME = "workspaces" as const;
export const DIRECT_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;

export function getDatasetParquetStoragePath(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
}): string {
  const { workspaceId, datasetId } = options;

  return `${workspaceId}/datasets/${datasetId}.parquet`;
}
