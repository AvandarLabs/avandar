import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configureSuccessfulRemove,
  DASHBOARD_ID,
  DATASET_ID,
  DATASET_PATH,
  fromMock,
  listMock,
  OLD_SNAPSHOT_REVISION,
  PublicDatasetParquetStorageClient,
  removeMock,
  SNAPSHOT_REVISION,
  STALE_DATASET_ID,
} from "@/clients/storage/PublicDatasetParquetStorageClient/__tests__/PublicDatasetParquetStorageClient.fixtures";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublicDatasetParquetStorageClient cleanup", () => {
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
    configureSuccessfulRemove();

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
    configureSuccessfulRemove();

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
    configureSuccessfulRemove();

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
    // The committed generation holds the same dataset IDs as the obsolete one,
    // so only the revision segment separates the two sets of objects.
    listMock.mockResolvedValueOnce({
      data: [
        { name: `${DATASET_ID}.parquet` },
        { name: `${STALE_DATASET_ID}.parquet` },
      ],
      error: null,
    });
    configureSuccessfulRemove();

    await PublicDatasetParquetStorageClient.deleteSnapshotGeneration({
      bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: OLD_SNAPSHOT_REVISION,
    });

    expect(removeMock).toHaveBeenCalledWith([
      `dashboards/${DASHBOARD_ID}/revisions/${OLD_SNAPSHOT_REVISION}/datasets/${DATASET_ID}.parquet`,
      `dashboards/${DASHBOARD_ID}/revisions/${OLD_SNAPSHOT_REVISION}/datasets/${STALE_DATASET_ID}.parquet`,
    ]);
    expect(removeMock).not.toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining(`/revisions/${SNAPSHOT_REVISION}/`),
      ]),
    );
  });

  it("deletes the exact legacy generation from its legacy path", async () => {
    listMock.mockResolvedValueOnce({
      data: [{ name: `${STALE_DATASET_ID}.parquet` }],
      error: null,
    });
    configureSuccessfulRemove();

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
