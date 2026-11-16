import { propEq } from "@avandar/utils";
import { DashboardMapBlocks } from "@/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks";
import { createMapSnapshotFromMapId } from "@/clients/maps/MapSnapshot/createMapSnapshotFromMapId/createMapSnapshotFromMapId";
import { PublicMapSnapshotStorageClient } from "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type {
  PublishedVisibility,
  SnapshotBucketName,
} from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";

/**
 * Compiles every map a dashboard shows, but only for a public publish. A
 * workspace dashboard renders its maps live for viewers who can open them.
 * Any map that cannot be compiled rejects the whole call, so a dashboard is
 * never published with some of its maps missing.
 */
export async function prepareMapSnapshots(
  options: Readonly<{
    dashboard: Dashboard.T;
    visibility: PublishedVisibility;
  }>,
): Promise<MapSnapshot[]> {
  if (options.visibility !== "public") {
    return [];
  }
  const snapshots: MapSnapshot[] = [];
  for (const mapId of DashboardMapBlocks.getMapIds(options.dashboard.config)) {
    // Maps compile one at a time so DuckDB holds one map's layers at once.
    // react-doctor-disable-next-line
    snapshots.push(
      await createMapSnapshotFromMapId({
        mapId,
        workspaceId: options.dashboard.workspaceId,
      }),
    );
  }
  return snapshots;
}

/**
 * Writes compiled map snapshots into a staged snapshot generation. Every
 * upload settles before the first failure is rethrown, so the publish never
 * cleans up a generation while a map is still being written into it.
 */
export async function uploadMapSnapshots(
  options: Readonly<{
    bucket: SnapshotBucketName;
    dashboardId: Dashboard.Id;
    snapshotRevision: string;
    mapSnapshots: readonly MapSnapshot[];
  }>,
): Promise<void> {
  const uploadResults = await Promise.allSettled(
    options.mapSnapshots.map((snapshot) => {
      return PublicMapSnapshotStorageClient.uploadMapSnapshot({
        bucket: options.bucket,
        dashboardId: options.dashboardId,
        snapshotRevision: options.snapshotRevision,
        snapshot,
      });
    }),
  );
  const failedUpload = uploadResults.find(propEq("status", "rejected"));
  if (failedUpload?.status === "rejected") {
    throw failedUpload.reason;
  }
}
