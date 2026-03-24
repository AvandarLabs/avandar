import { MIMEType } from "@utils/types/common.types";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import {
  getPublicDatasetParquetStoragePath,
  PUBLIC_BUCKET_NAME,
} from "./utils";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

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

/**
 * Lists dataset IDs that have a published Parquet object under the dashboard's
 * `dashboards/{dashboardId}/datasets/` prefix in the public bucket.
 *
 * @param options The list options.
 * @param options.dashboardId The dashboard whose published datasets to list.
 */
async function listDatasetIdsForDashboard(options: {
  dashboardId: DashboardId;
}): Promise<readonly DatasetId[]> {
  const { dashboardId } = options;
  const folderPath = `dashboards/${dashboardId}/datasets`;

  // TODO(jpsyx): we are limiting to 1000 datasets per dashboard for now, but
  // when we switch to data cubes and dice we may need to change to something
  // more dynamic
  const pageSize = 1000;

  const collectFromOffset = async (
    offset: number,
    acc: readonly DatasetId[],
  ): Promise<readonly DatasetId[]> => {
    const { data, error } = await AvaSupabase.DB.storage
      .from(PUBLIC_BUCKET_NAME)
      .list(folderPath, {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return acc;
    }

    const pageIds = data
      .filter((file) => {
        return file.name.endsWith(".parquet");
      })
      .map((file) => {
        return file.name.slice(0, -".parquet".length);
      }) as DatasetId[];

    const nextAcc = acc.concat(pageIds);

    if (data.length < pageSize) {
      return nextAcc;
    }

    return collectFromOffset(offset + pageSize, nextAcc);
  };

  return collectFromOffset(0, []);
}

export const PublicDatasetParquetStorageClient = {
  uploadDataset,
  downloadDataset,
  listDatasetIdsForDashboard,
};
