import { MIMEType, prop } from "@avandar/utils";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { MapSnapshotJson } from "@/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";

/** One snapshot generation in one bucket. */
type SnapshotGeneration = {
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  snapshotRevision: string;
};

/**
 * Page size for listing a generation's maps. A dashboard shows a handful of
 * maps, so one page always covers them.
 */
const MAP_LIST_PAGE_SIZE = 1000;

async function _uploadMapSnapshot(
  options: Readonly<SnapshotGeneration & { snapshot: MapSnapshot }>,
): Promise<void> {
  const objectPath = SnapshotStorageUtils.getPublicMapSnapshotStoragePath({
    dashboardId: options.dashboardId,
    snapshotRevision: options.snapshotRevision,
    mapId: options.snapshot.mapId,
  });
  const body = new Blob([MapSnapshotJson.toJson(options.snapshot)], {
    type: MIMEType.APPLICATION_JSON,
  });
  const { error } = await AvaSupabase.db()
    .storage.from(options.bucket)
    .upload(objectPath, body, {
      contentType: MIMEType.APPLICATION_JSON,
      upsert: true,
    });
  if (error) {
    throw new Error(error.message);
  }
}

async function _downloadMapSnapshot(
  options: Readonly<SnapshotGeneration & { mapId: AvaMap.Id }>,
): Promise<MapSnapshot | undefined> {
  const objectPath =
    SnapshotStorageUtils.getPublicMapSnapshotStoragePath(options);
  const { data, error } = await AvaSupabase.db()
    .storage.from(options.bucket)
    .download(objectPath);
  if (error || !data) {
    return undefined;
  }
  return MapSnapshotJson.fromJson(await data.text());
}

async function _listMapSnapshotPaths(
  options: Readonly<SnapshotGeneration>,
): Promise<string[]> {
  const folderPath = SnapshotStorageUtils.getPublicMapSnapshotFolder(options);
  const { data, error } = await AvaSupabase.db()
    .storage.from(options.bucket)
    .list(folderPath, {
      limit: MAP_LIST_PAGE_SIZE,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? [])
    .filter((file) => {
      return file.name.endsWith(".json");
    })
    .map((file) => {
      return `${folderPath}/${file.name}`;
    });
}

async function _deleteMapSnapshotsForGeneration(
  options: Readonly<
    SnapshotGeneration & { assertCanDelete?: () => Promise<void> }
  >,
): Promise<void> {
  if (
    options.snapshotRevision === SnapshotStorageUtils.LEGACY_SNAPSHOT_REVISION
  ) {
    return;
  }
  const objectPaths = await _listMapSnapshotPaths(options);
  if (objectPaths.length === 0) {
    return;
  }
  await options.assertCanDelete?.();
  const { data: removedObjects, error } = await AvaSupabase.db()
    .storage.from(options.bucket)
    .remove(objectPaths);
  if (error) {
    throw new Error(
      `Failed to clear map snapshots from ${options.bucket} for dashboard ${options.dashboardId}: ${error.message}`,
    );
  }
  // Storage RLS skips objects the caller may not delete without an error, so
  // only the returned names prove each snapshot is gone.
  const removedObjectNames = new Set(removedObjects?.map(prop("name")) ?? []);
  const missingObjectPaths = objectPaths.filter((objectPath) => {
    return !removedObjectNames.has(objectPath);
  });
  if (missingObjectPaths.length > 0) {
    throw new Error(
      `Failed to clear map snapshots from ${options.bucket} for dashboard ${options.dashboardId}: removed ${removedObjectNames.size} of ${objectPaths.length} requested objects.`,
    );
  }
}

/** Stores the rendered map files a public dashboard snapshot carries. */
export const PublicMapSnapshotStorageClient = {
  /** Writes one map snapshot into a staged generation. */
  uploadMapSnapshot: _uploadMapSnapshot,

  /** Reads one map snapshot, or `undefined` when the generation has none. */
  downloadMapSnapshot: _downloadMapSnapshot,

  /** Removes every map snapshot in one generation. */
  deleteMapSnapshotsForGeneration: _deleteMapSnapshotsForGeneration,
};
