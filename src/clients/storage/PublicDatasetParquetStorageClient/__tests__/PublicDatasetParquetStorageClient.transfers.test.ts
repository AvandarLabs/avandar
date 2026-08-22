import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DASHBOARD_ID,
  DATASET_ID,
  DATASET_PATH,
  downloadMock,
  fromMock,
  listMock,
  PublicDatasetParquetStorageClient,
  SNAPSHOT_REVISION,
  uploadMock,
} from "@/clients/storage/PublicDatasetParquetStorageClient/__tests__/PublicDatasetParquetStorageClient.fixtures";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublicDatasetParquetStorageClient transfers", () => {
  it("uploads a dashboard snapshot to its explicit private bucket", async () => {
    uploadMock.mockResolvedValue({ error: null });

    await PublicDatasetParquetStorageClient.uploadDataset({
      bucket: SnapshotStorageUtils.PRIVATE_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
      datasetId: DATASET_ID,
      snapshotRevision: SNAPSHOT_REVISION,
      parquetBlob: new Blob(["parquet"]),
    });

    expect(fromMock).toHaveBeenCalledWith(
      SnapshotStorageUtils.PRIVATE_BUCKET_NAME,
    );
    expect(uploadMock).toHaveBeenCalledWith(
      DATASET_PATH,
      expect.any(Blob),
      expect.objectContaining({ upsert: true }),
    );
  });

  it("downloads a dashboard snapshot from its explicit public bucket", async () => {
    const parquetBlob = new Blob(["parquet"]);
    downloadMock.mockResolvedValue({ data: parquetBlob, error: null });

    const result = await PublicDatasetParquetStorageClient.downloadDataset({
      bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
      datasetId: DATASET_ID,
      snapshotRevision: SNAPSHOT_REVISION,
      throwIfNotFound: true,
    });

    expect(result).toBe(parquetBlob);
    expect(fromMock).toHaveBeenCalledWith(
      SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
    );
    expect(downloadMock).toHaveBeenCalledWith(DATASET_PATH);
  });

  it("downloads the reserved legacy generation from its legacy path", async () => {
    const parquetBlob = new Blob(["parquet"]);
    downloadMock.mockResolvedValue({ data: parquetBlob, error: null });

    await PublicDatasetParquetStorageClient.downloadDataset({
      bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
      datasetId: DATASET_ID,
      snapshotRevision: SnapshotStorageUtils.LEGACY_SNAPSHOT_REVISION,
      throwIfNotFound: true,
    });

    expect(downloadMock).toHaveBeenCalledWith(
      `dashboards/${DASHBOARD_ID}/datasets/${DATASET_ID}.parquet`,
    );
  });

  it("lists a dashboard's snapshot datasets from its explicit bucket", async () => {
    listMock.mockResolvedValue({
      data: [{ name: `${DATASET_ID}.parquet` }],
      error: null,
    });

    const datasetIds =
      await PublicDatasetParquetStorageClient.listDatasetIdsForDashboard({
        bucket: SnapshotStorageUtils.PRIVATE_BUCKET_NAME,
        dashboardId: DASHBOARD_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      });

    expect(datasetIds).toEqual([DATASET_ID]);
    expect(fromMock).toHaveBeenCalledWith(
      SnapshotStorageUtils.PRIVATE_BUCKET_NAME,
    );
    expect(listMock).toHaveBeenCalledWith(
      `dashboards/${DASHBOARD_ID}/revisions/${SNAPSHOT_REVISION}/datasets`,
      expect.objectContaining({ limit: 1000 }),
    );
  });

  it("lists the reserved legacy generation from its legacy folder", async () => {
    listMock.mockResolvedValue({ data: [], error: null });

    await PublicDatasetParquetStorageClient.listDatasetIdsForDashboard({
      bucket: SnapshotStorageUtils.PRIVATE_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SnapshotStorageUtils.LEGACY_SNAPSHOT_REVISION,
    });

    expect(listMock).toHaveBeenCalledWith(
      `dashboards/${DASHBOARD_ID}/datasets`,
      expect.objectContaining({ limit: 1000 }),
    );
  });
});
