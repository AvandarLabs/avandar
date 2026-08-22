import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type {
  PublishedVisibility,
  SnapshotBucketName,
} from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";

import { isDefined, promiseMapSequential } from "@avandar/utils";

import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";

/** Gets the snapshot bucket operations for a target visibility. */
function _makeSnapshotTransitionPlanFromVisibility(
  visibility: PublishedVisibility,
): { uploadBucket: SnapshotBucketName; clearBucket: SnapshotBucketName } {
  return {
    uploadBucket:
      SnapshotStorageUtils.getSnapshotBucketNameFromVisibility(visibility),
    clearBucket:
      SnapshotStorageUtils.getOtherSnapshotBucketNameFromVisibility(visibility),
  };
}

/** Removes a dashboard's snapshots from every publication bucket. */
async function _clearAllSnapshotBuckets(
  options: Readonly<{
    assertCanDelete: () => Promise<void>;
    dashboardId: Dashboard.Id;
    deleteDatasetsForDashboard: (
      params: Readonly<{
        bucket: SnapshotBucketName;
        dashboardId: Dashboard.Id;
        assertCanDelete: () => Promise<void>;
      }>,
    ) => Promise<void>;
  }>,
): Promise<void> {
  const { assertCanDelete, dashboardId, deleteDatasetsForDashboard } = options;

  // The buckets are cleared one at a time: `assertCanDelete` re-checks the
  // transition claim and advances it, so a second concurrent clear would
  // fence the first out.
  const cleanupErrors = (
    await promiseMapSequential(
      [
        SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
        SnapshotStorageUtils.PRIVATE_BUCKET_NAME,
      ] as const,
      async (bucket) => {
        try {
          await deleteDatasetsForDashboard({
            assertCanDelete,
            bucket,
            dashboardId,
          });
          return undefined;
        } catch (error: unknown) {
          return { error };
        }
      },
    )
  ).filter(isDefined);
  if (cleanupErrors.length > 0) {
    throw cleanupErrors[0]!.error;
  }
}

/** Plans and cleans immutable dashboard snapshot transitions. */
export const DashboardSnapshotTransition = {
  /** Removes a dashboard's snapshots from every publication bucket. */
  clearAllSnapshotBuckets: _clearAllSnapshotBuckets,
  /** Gets snapshot bucket operations for a target visibility. */
  makeSnapshotTransitionPlanFromVisibility:
    _makeSnapshotTransitionPlanFromVisibility,
};
