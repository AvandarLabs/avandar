import { afterEach, describe, expect, it, vi } from "vitest";
import { SnapshotStorageUtils } from "./SnapshotStorageUtils/SnapshotStorageUtils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const { downloadMock, fromMock, listMock, removeMock, uploadMock } = vi.hoisted(
  () => {
    const mockedUpload = vi.fn();
    const mockedDownload = vi.fn();
    const mockedList = vi.fn();
    const mockedRemove = vi.fn();
    const mockedFrom = vi.fn(() => {
      return {
        upload: mockedUpload,
        download: mockedDownload,
        list: mockedList,
        remove: mockedRemove,
      };
    });

    return {
      downloadMock: mockedDownload,
      fromMock: mockedFrom,
      listMock: mockedList,
      removeMock: mockedRemove,
      uploadMock: mockedUpload,
    };
  },
);

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { storage: { from: fromMock } };
      },
    },
  };
});

const { PublicDatasetParquetStorageClient } =
  await import("./PublicDatasetParquetStorageClient");

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const STALE_DATASET_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const SNAPSHOT_REVISION = "44444444-4444-4444-8444-444444444444";
const OLD_SNAPSHOT_REVISION = "55555555-5555-4555-8555-555555555555";
const DATASET_PATH = `dashboards/${DASHBOARD_ID}/revisions/${SNAPSHOT_REVISION}/datasets/${DATASET_ID}.parquet`;

function _configureSuccessfulRemove(): void {
  removeMock.mockImplementation(async (objectPaths: readonly string[]) => {
    return {
      data: objectPaths.map((name) => {
        return { name };
      }),
      error: null,
    };
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublicDatasetParquetStorageClient", () => {
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

  it("removes every dashboard generation from its explicit bucket", async () => {
    listMock
      .mockResolvedValueOnce({
        data: [{ name: SNAPSHOT_REVISION }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ name: `${DATASET_ID}.parquet` }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ name: `${STALE_DATASET_ID}.parquet` }],
        error: null,
      });
    _configureSuccessfulRemove();

    await PublicDatasetParquetStorageClient.deleteDatasetsForDashboard({
      assertCanDelete: vi.fn().mockResolvedValue(undefined),
      bucket: SnapshotStorageUtils.PRIVATE_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
    });

    expect(fromMock).toHaveBeenNthCalledWith(
      1,
      SnapshotStorageUtils.PRIVATE_BUCKET_NAME,
    );
    expect(fromMock).toHaveBeenNthCalledWith(
      2,
      SnapshotStorageUtils.PRIVATE_BUCKET_NAME,
    );
    expect(listMock).toHaveBeenNthCalledWith(
      1,
      `dashboards/${DASHBOARD_ID}/revisions`,
      expect.objectContaining({ limit: 1000 }),
    );
    expect(removeMock).toHaveBeenCalledWith([
      `dashboards/${DASHBOARD_ID}/datasets/${DATASET_ID}.parquet`,
    ]);
    expect(removeMock).toHaveBeenCalledWith([
      `dashboards/${DASHBOARD_ID}/revisions/${SNAPSHOT_REVISION}/datasets/${STALE_DATASET_ID}.parquet`,
    ]);
  });

  it("paginates past 1000 revision folders before clearing them", async () => {
    const firstPageRevisions = Array.from({ length: 1000 }, (_, index) => {
      return { name: `revision-${String(index).padStart(4, "0")}` };
    });
    const finalRevision = "revision-1000";
    listMock.mockImplementation(async (folderPath, options) => {
      if (folderPath === `dashboards/${DASHBOARD_ID}/revisions`) {
        return {
          data:
            options.offset === 1000 ?
              [{ name: finalRevision }]
            : firstPageRevisions,
          error: null,
        };
      }

      return {
        data:
          folderPath.includes(finalRevision) ?
            [{ name: `${STALE_DATASET_ID}.parquet` }]
          : [],
        error: null,
      };
    });
    _configureSuccessfulRemove();

    await PublicDatasetParquetStorageClient.deleteDatasetsForDashboard({
      assertCanDelete: vi.fn().mockResolvedValue(undefined),
      bucket: SnapshotStorageUtils.PRIVATE_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
    });

    expect(listMock).toHaveBeenCalledWith(
      `dashboards/${DASHBOARD_ID}/revisions`,
      expect.objectContaining({ offset: 1000 }),
    );
    expect(removeMock).toHaveBeenCalledWith([
      `dashboards/${DASHBOARD_ID}/revisions/${finalRevision}/datasets/${STALE_DATASET_ID}.parquet`,
    ]);
  });

  it("revalidates the exact cleanup claim after listing and before removing", async () => {
    const assertCanDelete = vi
      .fn()
      .mockRejectedValue(
        new Error("Dashboard snapshot cleanup transition changed."),
      );
    listMock
      .mockResolvedValueOnce({
        data: [{ name: SNAPSHOT_REVISION }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ name: `${DATASET_ID}.parquet` }],
        error: null,
      });

    await expect(
      PublicDatasetParquetStorageClient.deleteDatasetsForDashboard({
        bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
        dashboardId: DASHBOARD_ID,
        assertCanDelete,
      }),
    ).rejects.toThrow("cleanup transition changed");

    expect(assertCanDelete).toHaveBeenCalledTimes(1);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("fences a stale cleanup worker from a replacement publisher generation", async () => {
    let activeTransitionRevision: string | undefined = OLD_SNAPSHOT_REVISION;
    let exposeReplacementRevision: (() => void) | undefined;
    const replacementRevisionReady = new Promise<void>((resolve) => {
      exposeReplacementRevision = resolve;
    });
    listMock.mockImplementation(async (folderPath) => {
      if (folderPath === `dashboards/${DASHBOARD_ID}/revisions`) {
        await replacementRevisionReady;
        return { data: [{ name: SNAPSHOT_REVISION }], error: null };
      }
      if (folderPath.endsWith(`/${SNAPSHOT_REVISION}/datasets`)) {
        return { data: [{ name: `${DATASET_ID}.parquet` }], error: null };
      }
      return { data: [], error: null };
    });
    const staleCleanupPromise =
      PublicDatasetParquetStorageClient.deleteDatasetsForDashboard({
        assertCanDelete: async () => {
          if (activeTransitionRevision !== OLD_SNAPSHOT_REVISION) {
            throw new Error("Dashboard snapshot cleanup transition changed.");
          }
        },
        bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
        dashboardId: DASHBOARD_ID,
      });

    activeTransitionRevision = undefined;
    activeTransitionRevision = SNAPSHOT_REVISION;
    exposeReplacementRevision?.();

    await expect(staleCleanupPromise).rejects.toThrow(
      "cleanup transition changed",
    );
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("removes only snapshots absent from the committed dashboard config", async () => {
    listMock.mockResolvedValue({
      data: [
        { name: `${DATASET_ID}.parquet` },
        { name: `${STALE_DATASET_ID}.parquet` },
      ],
      error: null,
    });
    _configureSuccessfulRemove();

    await PublicDatasetParquetStorageClient.reconcileDatasetsForDashboard({
      bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SNAPSHOT_REVISION,
      datasetIds: [DATASET_ID],
    });

    expect(removeMock).toHaveBeenCalledWith([
      `dashboards/${DASHBOARD_ID}/revisions/${SNAPSHOT_REVISION}/datasets/${STALE_DATASET_ID}.parquet`,
    ]);
  });

  it("rejects a successful remove response that deletes no requested objects", async () => {
    listMock.mockResolvedValueOnce({
      data: [{ name: `${STALE_DATASET_ID}.parquet` }],
      error: null,
    });
    removeMock.mockResolvedValue({ data: [], error: null });

    await expect(
      PublicDatasetParquetStorageClient.deleteSnapshotGeneration({
        bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
        dashboardId: DASHBOARD_ID,
        snapshotRevision: OLD_SNAPSHOT_REVISION,
      }),
    ).rejects.toThrow("removed 0 of 1 requested objects");
  });

  it("rejects a successful remove response that deletes only some requested objects", async () => {
    listMock.mockResolvedValueOnce({
      data: [
        { name: `${DATASET_ID}.parquet` },
        { name: `${STALE_DATASET_ID}.parquet` },
      ],
      error: null,
    });
    removeMock.mockResolvedValue({
      data: [{ name: DATASET_PATH }],
      error: null,
    });

    await expect(
      PublicDatasetParquetStorageClient.deleteSnapshotGeneration({
        bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
        dashboardId: DASHBOARD_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      }),
    ).rejects.toThrow("removed 1 of 2 requested objects");
  });

  it("deletes one exact obsolete generation without touching the committed one", async () => {
    listMock.mockResolvedValueOnce({
      data: [{ name: `${STALE_DATASET_ID}.parquet` }],
      error: null,
    });
    _configureSuccessfulRemove();

    await PublicDatasetParquetStorageClient.deleteSnapshotGeneration({
      bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: OLD_SNAPSHOT_REVISION,
    });

    expect(removeMock).toHaveBeenCalledWith([
      `dashboards/${DASHBOARD_ID}/revisions/${OLD_SNAPSHOT_REVISION}/datasets/${STALE_DATASET_ID}.parquet`,
    ]);
    expect(removeMock).not.toHaveBeenCalledWith(
      expect.arrayContaining([DATASET_PATH]),
    );
  });

  it("deletes the exact legacy generation from its legacy path", async () => {
    listMock.mockResolvedValueOnce({
      data: [{ name: `${STALE_DATASET_ID}.parquet` }],
      error: null,
    });
    _configureSuccessfulRemove();

    await PublicDatasetParquetStorageClient.deleteSnapshotGeneration({
      bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: SnapshotStorageUtils.LEGACY_SNAPSHOT_REVISION,
    });

    expect(removeMock).toHaveBeenCalledWith([
      `dashboards/${DASHBOARD_ID}/datasets/${STALE_DATASET_ID}.parquet`,
    ]);
  });
});
