import { MIMEType } from "$/lib/types/common";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { WorkspaceId } from "@/models/Workspace/Workspace.types";

const WORKSPACES_BUCKET_NAME = "workspaces" as const;

function _getDatasetParquetObjectPath(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
}): string {
  const { workspaceId, datasetId } = options;

  return `${workspaceId}/datasets/${datasetId}.parquet`;
}

async function uploadDatasetParquet(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
  parquetBlob: Blob;
}): Promise<void> {
  const { workspaceId, datasetId, parquetBlob } = options;

  const objectPath = _getDatasetParquetObjectPath({ workspaceId, datasetId });

  const { error } = await AvaSupabase.DB.storage
    .from(WORKSPACES_BUCKET_NAME)
    .upload(objectPath, parquetBlob, {
      contentType: MIMEType.APPLICATION_PARQUET,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

export const DatasetParquetStorageClient = {
  uploadDatasetParquet,
};
