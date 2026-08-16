import { MIMEType, prop } from "@avandar/utils";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type CollectDatasetIdsOptions = {
  bucket: SnapshotBucketName;
  collectedDatasetIds: Dataset.Id[];
  folderPath: string;
  offset: number;
  pageSize: number;
};

type SnapshotDatasetOptions = {
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  snapshotRevision: string;
  datasetId: Dataset.Id;
};

type UploadDatasetOptions = SnapshotDatasetOptions & { parquetBlob: Blob };
type DownloadDatasetOptions = SnapshotDatasetOptions & {
  throwIfNotFound?: boolean;
};
type DeleteDatasetsOptions = Omit<SnapshotDatasetOptions, "datasetId"> & {
  datasetIds: readonly Dataset.Id[];
  assertCanDelete?: () => Promise<void>;
};
type ReconcileDatasetsOptions = Omit<DeleteDatasetsOptions, "assertCanDelete">;
type DeleteSnapshotGenerationOptions = Omit<
  DeleteDatasetsOptions,
  "datasetIds"
>;

/** Gets the folder containing a dashboard's immutable generations. */
function _getDashboardRevisionsFolder(dashboardId: Dashboard.Id): string {
  return `dashboards/${dashboardId}/revisions`;
}

/** Gets the snapshot generation folder containing a dashboard's datasets. */
function _getDashboardDatasetsFolder(
  options: Readonly<{
    dashboardId: Dashboard.Id;
    snapshotRevision: string;
  }>,
): string {
  const { dashboardId, snapshotRevision } = options;

  if (snapshotRevision === SnapshotStorageUtils.LEGACY_SNAPSHOT_REVISION) {
    return `dashboards/${dashboardId}/datasets`;
  }

  return `${_getDashboardRevisionsFolder(dashboardId)}/${snapshotRevision}/datasets`;
}

/** Uploads a published dataset Parquet blob to a snapshot bucket. */
async function _uploadDataset(
  options: Readonly<UploadDatasetOptions>,
): Promise<void> {
  const { bucket, dashboardId, snapshotRevision, datasetId, parquetBlob } =
    options;

  const objectPath = SnapshotStorageUtils.getPublicDatasetParquetStoragePath({
    dashboardId,
    snapshotRevision,
    datasetId,
  });

  const { error } = await AvaSupabase.db()
    .storage.from(bucket)
    .upload(objectPath, parquetBlob, {
      contentType: MIMEType.APPLICATION_PARQUET,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Downloads a published dataset's Parquet file from a snapshot bucket.
 *
 * @param options The options for downloading the dataset's Parquet file.
 * @param options.bucket Which snapshot bucket to read from.
 * @param options.dashboardId The dashboard ID that owns this published copy.
 * @param options.snapshotRevision The committed snapshot generation UUID.
 * @param options.datasetId The ID of the dataset to download the Parquet file
 * for.
 * @param options.throwIfNotFound Whether to throw an error if the Parquet file
 * is not found. If false, the function will return undefined if the Parquet
 * file is not found. Defaults to false (does not throw error).
 */
async function _downloadDataset(
  options: Readonly<DownloadDatasetOptions & { throwIfNotFound?: false }>,
): Promise<Blob | undefined>;
async function _downloadDataset(
  options: Readonly<DownloadDatasetOptions & { throwIfNotFound: true }>,
): Promise<Blob>;
async function _downloadDataset({
  bucket,
  dashboardId,
  snapshotRevision,
  datasetId,
  throwIfNotFound = false,
}: Readonly<DownloadDatasetOptions>): Promise<Blob | undefined> {
  const objectPath = SnapshotStorageUtils.getPublicDatasetParquetStoragePath({
    dashboardId,
    snapshotRevision,
    datasetId,
  });

  const { data: parquetBlob, error: downloadError } = await AvaSupabase.db()
    .storage.from(bucket)
    .download(objectPath);

  if (!downloadError && parquetBlob) {
    return parquetBlob;
  }

  if (throwIfNotFound) {
    const message: string = downloadError?.message ?? "Unknown download error";
    throw new Error(
      [
        "Published parquet download failed.",
        `Bucket: ${bucket}.`,
        `Path: ${objectPath}.`,
        `Error: ${message}.`,
      ].join(" "),
    );
  }

  return undefined;
}

async function _collectDatasetIdsFromOffset(
  options: Readonly<CollectDatasetIdsOptions>,
): Promise<Dataset.Id[]> {
  const { bucket, collectedDatasetIds, folderPath, offset, pageSize } = options;
  const { data, error } = await AvaSupabase.db()
    .storage.from(bucket)
    .list(folderPath, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    return collectedDatasetIds;
  }
  const pageIds = data
    .filter((file) => {
      return file.name.endsWith(".parquet");
    })
    .map((file) => {
      return file.name.slice(0, -".parquet".length);
    }) as Dataset.Id[];
  const allDatasetIds = collectedDatasetIds.concat(pageIds);
  return data.length < pageSize ?
      allDatasetIds
    : _collectDatasetIdsFromOffset({
        ...options,
        offset: offset + pageSize,
        collectedDatasetIds: allDatasetIds,
      });
}

/**
 * Lists dataset IDs that have a published Parquet object under the dashboard's
 * generation prefix in the given bucket.
 *
 * @param options.bucket Which snapshot bucket to list.
 * @param options.dashboardId The dashboard whose published datasets to list.
 * @param options.snapshotRevision The snapshot generation to list.
 */
async function _listDatasetIdsForDashboard(
  options: Readonly<{
    bucket: SnapshotBucketName;
    dashboardId: Dashboard.Id;
    snapshotRevision: string;
  }>,
): Promise<Dataset.Id[]> {
  const { bucket, dashboardId, snapshotRevision } = options;
  const folderPath = _getDashboardDatasetsFolder({
    dashboardId,
    snapshotRevision,
  });

  // TODO(jpsyx): we are limiting to 1000 datasets per dashboard for now, but
  // when we switch to data cubes and dice we may need to change to something
  // more dynamic
  const pageSize = 1000;

  return _collectDatasetIdsFromOffset({
    bucket,
    collectedDatasetIds: [],
    folderPath,
    offset: 0,
    pageSize,
  });
}

async function _deleteDatasets(
  options: Readonly<DeleteDatasetsOptions>,
): Promise<void> {
  const { assertCanDelete, bucket, dashboardId, snapshotRevision, datasetIds } =
    options;

  if (datasetIds.length === 0) {
    return;
  }

  const objectPaths = datasetIds.map((datasetId) => {
    return SnapshotStorageUtils.getPublicDatasetParquetStoragePath({
      dashboardId,
      snapshotRevision,
      datasetId,
    });
  });
  await assertCanDelete?.();
  const { data: removedObjects, error } = await AvaSupabase.db()
    .storage.from(bucket)
    .remove(objectPaths);

  if (error) {
    throw new Error(
      `Failed to clear snapshots from ${bucket} for dashboard ${dashboardId}: ${error.message}`,
    );
  }

  const removedObjectNames = new Set(removedObjects?.map(prop("name")) ?? []);
  const missingObjectPaths = objectPaths.filter((objectPath) => {
    return !removedObjectNames.has(objectPath);
  });
  if (missingObjectPaths.length > 0) {
    throw new Error(
      `Failed to clear snapshots from ${bucket} for dashboard ${dashboardId}: removed ${removedObjectNames.size} of ${objectPaths.length} requested objects.`,
    );
  }
}

/** Removes snapshots that are absent from the dashboard's current config. */
async function _reconcileDatasetsForDashboard(
  options: Readonly<ReconcileDatasetsOptions>,
): Promise<void> {
  const { bucket, dashboardId, snapshotRevision, datasetIds } = options;
  const expectedDatasetIds = new Set(datasetIds);
  const storedDatasetIds = await _listDatasetIdsForDashboard({
    bucket,
    dashboardId,
    snapshotRevision,
  });
  const obsoleteDatasetIds = storedDatasetIds.filter((datasetId) => {
    return !expectedDatasetIds.has(datasetId);
  });

  await _deleteDatasets({
    bucket,
    dashboardId,
    snapshotRevision,
    datasetIds: obsoleteDatasetIds,
  });
}

async function _listSnapshotRevisions(
  options: Readonly<{
    bucket: SnapshotBucketName;
    dashboardId: Dashboard.Id;
  }>,
): Promise<string[]> {
  const { bucket, dashboardId } = options;
  const pageSize = 1000;
  const collectFromOffset = async (
    pagination: Readonly<{
      offset: number;
      collectedRevisions: string[];
    }>,
  ): Promise<string[]> => {
    const { offset, collectedRevisions } = pagination;
    const { data, error } = await AvaSupabase.db()
      .storage.from(bucket)
      .list(_getDashboardRevisionsFolder(dashboardId), {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      throw new Error(error.message);
    }
    const pageRevisions = data?.map(prop("name")) ?? [];
    const allRevisions = collectedRevisions.concat(pageRevisions);
    if (pageRevisions.length < pageSize) {
      return allRevisions;
    }
    return collectFromOffset({
      offset: offset + pageSize,
      collectedRevisions: allRevisions,
    });
  };

  const versionedRevisions = await collectFromOffset({
    offset: 0,
    collectedRevisions: [],
  });

  return [SnapshotStorageUtils.LEGACY_SNAPSHOT_REVISION, ...versionedRevisions];
}

/** Removes one immutable snapshot generation from a bucket. */
async function _deleteSnapshotGeneration(
  options: Readonly<DeleteSnapshotGenerationOptions>,
): Promise<void> {
  const datasetIds = await _listDatasetIdsForDashboard(options);
  await _deleteDatasets({ ...options, datasetIds });
}

/** Removes every snapshot object for a dashboard from one bucket. */
async function _deleteDatasetsForDashboard(
  options: Readonly<{
    bucket: SnapshotBucketName;
    dashboardId: Dashboard.Id;
    assertCanDelete: () => Promise<void>;
  }>,
): Promise<void> {
  const { assertCanDelete, bucket, dashboardId } = options;
  const revisions = await _listSnapshotRevisions({ bucket, dashboardId });
  for (const snapshotRevision of revisions) {
    // Generations are deleted one at a time: every `_deleteSnapshotGeneration`
    // re-checks the caller's transition claim through `assertCanDelete` and
    // advances it, so concurrent deletes would fence each other out.
    // react-doctor-disable-next-line
    await _deleteSnapshotGeneration({
      assertCanDelete,
      bucket,
      dashboardId,
      snapshotRevision,
    });
  }
}

/** Manages published dataset snapshot objects in explicit buckets. */
export const PublicDatasetParquetStorageClient = {
  /** Uploads a published dataset Parquet blob to a snapshot bucket. */
  uploadDataset: _uploadDataset,

  /** Downloads a published dataset Parquet blob from a snapshot bucket. */
  downloadDataset: _downloadDataset,

  /** Lists published dataset IDs for a dashboard in a snapshot bucket. */
  listDatasetIdsForDashboard: _listDatasetIdsForDashboard,

  /** Removes target-bucket snapshots absent from the current dashboard. */
  reconcileDatasetsForDashboard: _reconcileDatasetsForDashboard,

  /** Removes one immutable snapshot generation. */
  deleteSnapshotGeneration: _deleteSnapshotGeneration,

  /** Removes a dashboard's published dataset snapshots from one bucket. */
  deleteDatasetsForDashboard: _deleteDatasetsForDashboard,
};
