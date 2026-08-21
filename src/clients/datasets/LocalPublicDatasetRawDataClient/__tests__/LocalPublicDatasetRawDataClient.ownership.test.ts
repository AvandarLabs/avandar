import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DASHBOARD_A_ID,
  DASHBOARD_B_ID,
  DATASET_ID,
  dropTableViewAndFileMock,
  fetchPublicDatasetToIndexedDBMock,
  FIRST_REVISION,
  getByIdMock,
  getRawDataClient,
  hasTableOrViewMock,
  loadParquetMock,
  PRIVATE_BUCKET,
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

describe("LocalPublicDatasetRawDataClient snapshot ownership", () => {
  it("reloads a dataset table when a different dashboard owns the loaded slice", async () => {
    const { LocalPublicDatasetRawDataClient } = await getRawDataClient();
    hasTableOrViewMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetIds: [DATASET_ID],
      snapshotRevision: FIRST_REVISION,
    });
    await LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_B_ID,
      datasetIds: [DATASET_ID],
      snapshotRevision: FIRST_REVISION,
    });

    expect(dropTableViewAndFileMock).toHaveBeenCalledWith({
      tableOrViewName: DATASET_ID,
      datasetDuckDbLease: expect.any(Object),
    });
    expect(loadParquetMock).toHaveBeenCalledTimes(2);
  });

  it("reuses an in-memory dataset table owned by the same dashboard", async () => {
    const { LocalPublicDatasetRawDataClient } = await getRawDataClient();
    hasTableOrViewMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetIds: [DATASET_ID],
      snapshotRevision: FIRST_REVISION,
    });
    await LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetIds: [DATASET_ID],
      snapshotRevision: FIRST_REVISION,
    });

    expect(dropTableViewAndFileMock).not.toHaveBeenCalled();
    expect(loadParquetMock).toHaveBeenCalledTimes(1);
  });

  it("uses the dashboard dataset pair and bucket when a snapshot is not cached", async () => {
    const { LocalPublicDatasetRawDataClient } = await getRawDataClient();
    const parquetData = new Blob(["downloaded snapshot"]);
    getByIdMock.mockResolvedValue(undefined);
    fetchPublicDatasetToIndexedDBMock.mockResolvedValue({ parquetData });

    await LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetIds: [DATASET_ID],
      snapshotRevision: FIRST_REVISION,
    });

    expect(getByIdMock).toHaveBeenCalledWith({
      id: [DASHBOARD_A_ID, DATASET_ID],
    });
    expect(fetchPublicDatasetToIndexedDBMock).toHaveBeenCalledWith({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      snapshotRevision: FIRST_REVISION,
    });
  });

  it("reloads the private snapshot when one dashboard changes visibility", async () => {
    const { LocalPublicDatasetRawDataClient } = await getRawDataClient();
    hasTableOrViewMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    getByIdMock.mockResolvedValue({
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      bucket: PUBLIC_BUCKET,
      snapshotRevision: FIRST_REVISION,
      parquetData: new Blob(["public snapshot"]),
      downloadedAt: new Date().toISOString(),
    });
    fetchPublicDatasetToIndexedDBMock.mockResolvedValue({
      parquetData: new Blob(["workspace snapshot"]),
    });

    await LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
      bucket: PUBLIC_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetIds: [DATASET_ID],
      snapshotRevision: FIRST_REVISION,
    });
    await LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetIds: [DATASET_ID],
      snapshotRevision: SECOND_REVISION,
    });

    expect(fetchPublicDatasetToIndexedDBMock).toHaveBeenCalledWith({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      snapshotRevision: SECOND_REVISION,
    });
    expect(dropTableViewAndFileMock).toHaveBeenCalledWith({
      tableOrViewName: DATASET_ID,
      datasetDuckDbLease: expect.any(Object),
    });
    expect(loadParquetMock).toHaveBeenCalledTimes(2);
  });

  it("reloads a same-bucket table when the publication revision changes", async () => {
    const { LocalPublicDatasetRawDataClient } = await getRawDataClient();
    hasTableOrViewMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    getByIdMock.mockResolvedValue({
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      bucket: PUBLIC_BUCKET,
      snapshotRevision: SECOND_REVISION,
      parquetData: new Blob(["republished snapshot"]),
      downloadedAt: new Date().toISOString(),
    });

    await LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
      bucket: PUBLIC_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetIds: [DATASET_ID],
      snapshotRevision: FIRST_REVISION,
    });
    await LocalPublicDatasetRawDataClient.loadDatasetsToMemory({
      bucket: PUBLIC_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetIds: [DATASET_ID],
      snapshotRevision: SECOND_REVISION,
    });

    expect(dropTableViewAndFileMock).toHaveBeenCalledWith({
      tableOrViewName: DATASET_ID,
      datasetDuckDbLease: expect.any(Object),
    });
    expect(loadParquetMock).toHaveBeenCalledTimes(2);
  });
});
