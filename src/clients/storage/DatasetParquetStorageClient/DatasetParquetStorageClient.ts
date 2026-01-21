import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { startDatasetUpload } from "./startDatasetUpload";
import { getDatasetParquetStoragePath, WORKSPACES_BUCKET_NAME } from "./utils";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { WorkspaceId } from "@/models/Workspace/Workspace.types";

/**
 * Deletes all Parquet files for a dataset from object storage.
 *
 * @param options The options for deleting the dataset's Parquet files.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset to delete the Parquet files
 * for.
 */
async function deleteDataset(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
}): Promise<void> {
  const { workspaceId, datasetId } = options;

  const objectPath = getDatasetParquetStoragePath({
    workspaceId,
    datasetId,
  });

  const { error } = await AvaSupabase.DB.storage
    .from(WORKSPACES_BUCKET_NAME)
    .remove([objectPath]);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Downloads a dataset's Parquet file from object storage.
 * @param options The options for downloading the dataset's Parquet file.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset to download the Parquet file
 * for.
 * @param options.throwIfNotFound Whether to throw an error if the Parquet file
 * is not found. If false, the function will return undefined if the Parquet
 * file is not found. Defaults to false (does not throw error).
 * @returns
 */
async function downloadDataset(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
  throwIfNotFound?: false | undefined;
}): Promise<Blob | undefined>;
async function downloadDataset(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
  throwIfNotFound: true;
}): Promise<Blob>;
async function downloadDataset({
  workspaceId,
  datasetId,
  throwIfNotFound = false,
}: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
  throwIfNotFound?: boolean;
}): Promise<Blob | undefined> {
  const objectPath = `${workspaceId}/datasets/${datasetId}.parquet`;
  const { data: parquetBlob, error } = await AvaSupabase.DB.storage
    .from("workspaces")
    .download(objectPath);

  if (error) {
    if (throwIfNotFound) {
      throw new Error(error.message);
    }
    return undefined;
  }

  if (!parquetBlob) {
    if (throwIfNotFound) {
      throw new Error("Parquet blob download returned empty data");
    }
    return undefined;
  }
  return parquetBlob;
}

export const DatasetParquetStorageClient = {
  startDatasetUpload,
  deleteDataset,
  downloadDataset,
};
