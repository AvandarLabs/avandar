import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureRevisionRace,
  createDeferred,
  DASHBOARD_A_ID,
  DATASET_ID,
  dropTableViewAndFileMock,
  FIRST_REVISION,
  flushMicrotasks,
  getRawDataClient,
  loadParquetMock,
  loadRevision,
  PUBLIC_BUCKET,
  SECOND_REVISION,
  setUpRawDataMocks,
  tearDownRawDataMocks,
} from "@/clients/datasets/LocalPublicDatasetRawDataClient/__tests__/LocalPublicDatasetRawDataClient.fixtures";

beforeEach(() => {
  setUpRawDataMocks();
});

afterEach(() => {
  tearDownRawDataMocks();
});

describe("LocalPublicDatasetRawDataClient load failures", () => {
  it("removes a partially created table when a public load fails", async () => {
    const loadError = new Error("load failed after creating the view");
    loadParquetMock.mockRejectedValue(loadError);
    const { LocalPublicDatasetRawDataClient } = await getRawDataClient();

    await expect(
      LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
        bucket: PUBLIC_BUCKET,
        dashboardId: DASHBOARD_A_ID,
        datasetIds: [DATASET_ID],
        snapshotRevision: FIRST_REVISION,
      }),
    ).rejects.toBe(loadError);

    expect(dropTableViewAndFileMock).toHaveBeenCalledWith({
      tableOrViewName: DATASET_ID,
      datasetDuckDbLease: expect.any(Object),
    });
  });

  it("poisons a partial table when compensating cleanup also fails", async () => {
    const loadError = new Error("load failed after creating the view");
    loadParquetMock.mockRejectedValue(loadError);
    dropTableViewAndFileMock.mockRejectedValue(new Error("drop failed"));
    const { LocalPublicDatasetRawDataClient } = await getRawDataClient();

    await expect(
      LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
        bucket: PUBLIC_BUCKET,
        dashboardId: DASHBOARD_A_ID,
        datasetIds: [DATASET_ID],
        snapshotRevision: FIRST_REVISION,
      }),
    ).rejects.toBe(loadError);

    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    expect(
      DatasetDuckDbCoordinator.hasPublicSnapshotDatasetOwner(DATASET_ID),
    ).toBe(true);
    expect(
      DatasetDuckDbCoordinator.isPublicSnapshotDatasetOwner({
        datasetId: DATASET_ID,
        owner: {
          bucket: PUBLIC_BUCKET,
          dashboardId: DASHBOARD_A_ID,
          snapshotRevision: FIRST_REVISION,
        },
      }),
    ).toBe(false);
  });

  it("keeps the newest requested revision in DuckDB when an older load finishes later", async () => {
    const firstLoad = createDeferred<void>();
    const { getLoadedRevision } = configureRevisionRace(firstLoad);
    const { LocalPublicDatasetRawDataClient } = await getRawDataClient();
    const firstRevisionPromise = loadRevision({
      client: LocalPublicDatasetRawDataClient,
      snapshotRevision: FIRST_REVISION,
    });
    await vi.waitFor(() => {
      expect(loadParquetMock).toHaveBeenCalledTimes(1);
    });

    const secondRevisionPromise = loadRevision({
      client: LocalPublicDatasetRawDataClient,
      snapshotRevision: SECOND_REVISION,
    });
    await flushMicrotasks();
    firstLoad.resolve();

    await Promise.all([firstRevisionPromise, secondRevisionPromise]);

    expect(getLoadedRevision()).toBe(SECOND_REVISION);
  });
});
