import type { DashboardId } from "@/models/Dashboard/Dashboard.types";
import type { DatasetId } from "@/models/datasets/Dataset";

// Due to a Supabase bug we cannot use "public" as a bucket name, so
// we use "published" instead.
export const PUBLIC_BUCKET_NAME = "published" as const;

/**
 * Gets the object storage path for a published dataset parquet file.
 *
 * @param options The path options.
 * @param options.dashboardId The dashboard ID that owns this published copy.
 * @param options.datasetId The dataset ID.
 */
export function getPublicDatasetParquetStoragePath(options: {
  dashboardId: DashboardId;
  datasetId: DatasetId;
}): string {
  const { dashboardId, datasetId } = options;

  return `dashboards/${dashboardId}/datasets/${datasetId}.parquet`;
}
