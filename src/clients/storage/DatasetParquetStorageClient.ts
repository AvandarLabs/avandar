import { MIMEType } from "$/lib/types/common";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { WorkspaceId } from "@/models/Workspace/Workspace.types";

const WORKSPACES_BUCKET_NAME = "workspaces" as const;

function _getDatasetParquetObjectPath(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
  fileNameSuffix?: string;
}): string {
  const { workspaceId, datasetId, fileNameSuffix } = options;

  const suffix = fileNameSuffix ? `-${fileNameSuffix}` : "";
  return `${workspaceId}/datasets/${datasetId}${suffix}.parquet`;
}

function _getDatasetParquetObjectPaths(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
}): readonly [string, string] {
  const { workspaceId, datasetId } = options;

  const plainPath = _getDatasetParquetObjectPath({
    workspaceId,
    datasetId,
  });

  const zstdPath = _getDatasetParquetObjectPath({
    workspaceId,
    datasetId,
    fileNameSuffix: "zstd",
  });

  return [plainPath, zstdPath] as const;
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
 * Uploads a ZSTD compressed Parquet file to the dataset's object storage
 * bucket.
 * This is an experimental function we are using in the short term just to
 * see if we get any storage gains from using ZSTD compression on parquet files.
 */
async function uploadDatasetParquetZSTD(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
  parquetBlob: Blob;
}): Promise<void> {
  const { workspaceId, datasetId, parquetBlob } = options;

  const objectPath = _getDatasetParquetObjectPath({
    workspaceId,
    datasetId,
    fileNameSuffix: "zstd",
  });

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

  const objectPaths = _getDatasetParquetObjectPaths({
    workspaceId,
    datasetId,
  });

  const { error } = await AvaSupabase.DB.storage
    .from(WORKSPACES_BUCKET_NAME)
    .remove([...objectPaths]);

  if (error) {
    throw new Error(error.message);
  }
}

export const DatasetParquetStorageClient = {
  uploadDatasetParquet,
  uploadDatasetParquetZSTD,
  deleteDatasetParquetObjects,
};
