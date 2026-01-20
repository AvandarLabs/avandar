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

/**
 * Deletes all Parquet files for a dataset from object storage.
 *
 * @param options The options for deleting the dataset's Parquet files.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset to delete the Parquet files
 * for.
 */
async function deleteDatasetParquetObjects(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
}): Promise<void> {
  const { workspaceId, datasetId } = options;

  const objectPath = _getDatasetParquetObjectPath({
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
async function downloadParquetDataset(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
  throwIfNotFound?: false | undefined;
}): Promise<Blob | undefined>;
async function downloadParquetDataset(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
  throwIfNotFound: true;
}): Promise<Blob>;
async function downloadParquetDataset({
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
  uploadDatasetParquet,
  deleteDatasetParquetObjects,
  downloadParquetDataset,
};
