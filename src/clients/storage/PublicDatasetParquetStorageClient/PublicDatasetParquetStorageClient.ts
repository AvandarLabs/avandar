import { MIMEType } from "$/lib/types/common";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import {
  getPublicDatasetParquetStoragePath,
  PUBLIC_BUCKET_NAME,
} from "./utils";
import type { DashboardId } from "@/models/Dashboard/Dashboard.types";
import type { DatasetId } from "@/models/datasets/Dataset";

/**
 * Uploads published dataset Parquet blobs to the `public` Supabase
 * Storage bucket.
 */
async function uploadDataset(options: {
  dashboardId: DashboardId;
  datasetId: DatasetId;
  parquetBlob: Blob;
}): Promise<void> {
  const { dashboardId, datasetId, parquetBlob } = options;

  const objectPath = getPublicDatasetParquetStoragePath({
    dashboardId,
    datasetId,
  });

  const { error } = await AvaSupabase.DB.storage
    .from(PUBLIC_BUCKET_NAME)
    .upload(objectPath, parquetBlob, {
      contentType: MIMEType.APPLICATION_PARQUET,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Downloads a published dataset's Parquet file from object storage.
 *
 * @param options The options for downloading the dataset's Parquet file.
 * @param options.dashboardId The dashboard ID that owns this published copy.
 * @param options.datasetId The ID of the dataset to download the Parquet file
 * for.
 * @param options.throwIfNotFound Whether to throw an error if the Parquet file
 * is not found. If false, the function will return undefined if the Parquet
 * file is not found. Defaults to false (does not throw error).
 */
async function downloadDataset(options: {
  dashboardId: DashboardId;
  datasetId: DatasetId;
  throwIfNotFound?: false | undefined;
}): Promise<Blob | undefined>;
async function downloadDataset(options: {
  dashboardId: DashboardId;
  datasetId: DatasetId;
  throwIfNotFound: true;
}): Promise<Blob>;
async function downloadDataset({
  dashboardId,
  datasetId,
  throwIfNotFound = false,
}: {
  dashboardId: DashboardId;
  datasetId: DatasetId;
  throwIfNotFound?: boolean;
}): Promise<Blob | undefined> {
  const objectPath = getPublicDatasetParquetStoragePath({
    dashboardId,
    datasetId,
  });

  const { data: parquetBlob, error: downloadError } =
    await AvaSupabase.DB.storage.from(PUBLIC_BUCKET_NAME).download(objectPath);

  if (!downloadError && parquetBlob) {
    return parquetBlob;
  }

  if (throwIfNotFound) {
    const message: string = downloadError?.message ?? "Unknown download error";
    throw new Error(
      "Public parquet download failed. " +
        `Path: ${objectPath}. ` +
        `Error: ${message}.`,
    );
  }

  return undefined;
}

export const PublicDatasetParquetStorageClient = {
  uploadDataset,
  downloadDataset,
};
