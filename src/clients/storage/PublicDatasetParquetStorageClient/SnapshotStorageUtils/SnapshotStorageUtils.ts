import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** World-readable snapshot bucket, named for a Supabase workaround. */
const PUBLIC_BUCKET_NAME = "published" as const;

/** Private snapshot bucket for workspace-only dashboards. */
const PRIVATE_BUCKET_NAME = "published-private" as const;

/** Reserved revision identifying snapshots stored before generation folders. */
const LEGACY_SNAPSHOT_REVISION =
  "00000000-0000-0000-0000-000000000000" as const;

/** Dashboard visibilities with snapshots. Draft dashboards have none. */
export type PublishedVisibility = Exclude<Dashboard.Visibility, "draft">;

/** The bucket names used for public and workspace-only snapshots. */
export type SnapshotBucketName =
  | typeof PUBLIC_BUCKET_NAME
  | typeof PRIVATE_BUCKET_NAME;

const BUCKET_BY_VISIBILITY = {
  public: PUBLIC_BUCKET_NAME,
  workspace: PRIVATE_BUCKET_NAME,
} as const satisfies Record<PublishedVisibility, SnapshotBucketName>;

/** Gets the snapshot bucket for a dashboard visibility. */
function _getSnapshotBucketNameFromVisibility(
  visibility: PublishedVisibility,
): SnapshotBucketName {
  return BUCKET_BY_VISIBILITY[visibility];
}

/** Gets the bucket to clear during a transition to a dashboard visibility. */
function _getOtherSnapshotBucketNameFromVisibility(
  visibility: PublishedVisibility,
): SnapshotBucketName {
  return visibility === "public" ? PRIVATE_BUCKET_NAME : PUBLIC_BUCKET_NAME;
}

/**
 * Gets the object storage path for a published dataset parquet file.
 *
 * @param options The path options.
 * @param options.dashboardId The dashboard ID that owns this published copy.
 * @param options.snapshotRevision The immutable snapshot generation UUID.
 * @param options.datasetId The dataset ID.
 */
function _getPublicDatasetParquetStoragePath(
  options: Readonly<{
    dashboardId: Dashboard.Id;
    snapshotRevision: string;
    datasetId: Dataset.Id;
  }>,
): string {
  const { dashboardId, snapshotRevision, datasetId } = options;

  if (snapshotRevision === LEGACY_SNAPSHOT_REVISION) {
    return `dashboards/${dashboardId}/datasets/${datasetId}.parquet`;
  }

  return `dashboards/${dashboardId}/revisions/${snapshotRevision}/datasets/${datasetId}.parquet`;
}

/** Storage constants and path helpers for immutable dashboard snapshots. */
export const SnapshotStorageUtils = {
  /** Reserved revision for snapshots stored before generation folders. */
  LEGACY_SNAPSHOT_REVISION,
  /** Private snapshot bucket for workspace-only dashboards. */
  PRIVATE_BUCKET_NAME,
  /** World-readable snapshot bucket, named for a Supabase workaround. */
  PUBLIC_BUCKET_NAME,
  /** Gets the bucket cleared when a dashboard changes visibility. */
  getOtherSnapshotBucketNameFromVisibility:
    _getOtherSnapshotBucketNameFromVisibility,
  /** Gets the snapshot bucket for a dashboard visibility. */
  getSnapshotBucketNameFromVisibility: _getSnapshotBucketNameFromVisibility,
  /** Gets the object path for a published dataset parquet file. */
  getPublicDatasetParquetStoragePath: _getPublicDatasetParquetStoragePath,
};
