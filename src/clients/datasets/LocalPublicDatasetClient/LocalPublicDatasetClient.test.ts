import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DASHBOARD_A_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const DASHBOARD_B_ID = "33333333-3333-4333-8333-333333333333" as Dashboard.Id;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const PRIVATE_BUCKET = "published-private" as const;
const PUBLIC_BUCKET = "published" as const;
const SNAPSHOT_REVISION = "2026-08-14T01:00:00.000Z";

const { downloadDatasetMock, getByIdMock, insertMock, loggerMock } = vi.hoisted(
  () => {
    const mockedLogger = { appendName: vi.fn(), log: vi.fn() };
    mockedLogger.appendName.mockReturnValue(mockedLogger);

    return {
      downloadDatasetMock: vi.fn(),
      getByIdMock: vi.fn(),
      insertMock: vi.fn(),
      loggerMock: mockedLogger,
    };
  },
);

vi.mock(
  "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient",
  () => {
    return {
      PublicDatasetParquetStorageClient: {
        downloadDataset: downloadDatasetMock,
      },
    };
  },
);

vi.mock("@/clients/dexie/createDexieCrudClient", () => {
  return {
    createDexieCrudClient: (config: {
      mutations: (options: { logger: typeof loggerMock }) => object;
    }) => {
      const client = { getById: getByIdMock, insert: insertMock };
      return Object.assign(client, config.mutations({ logger: loggerMock }));
    },
  };
});

const { LocalPublicDatasetClient } =
  await import("@/clients/datasets/LocalPublicDatasetClient/LocalPublicDatasetClient");

beforeEach(() => {
  vi.clearAllMocks();
  getByIdMock.mockResolvedValue(undefined);
  insertMock.mockImplementation(async ({ data }: { data: object }) => {
    return data;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB", () => {
  it("keeps simultaneous downloads for different dashboard snapshots separate", async () => {
    downloadDatasetMock.mockImplementation(
      async ({ dashboardId }: { dashboardId: Dashboard.Id }) => {
        return new Blob([dashboardId]);
      },
    );

    const [firstDataset, secondDataset] = await Promise.all([
      LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB({
        bucket: PUBLIC_BUCKET,
        dashboardId: DASHBOARD_A_ID,
        datasetId: DATASET_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      }),
      LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB({
        bucket: PRIVATE_BUCKET,
        dashboardId: DASHBOARD_B_ID,
        datasetId: DATASET_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      }),
    ]);

    expect(downloadDatasetMock).toHaveBeenCalledTimes(2);
    expect(firstDataset.dashboardId).toBe(DASHBOARD_A_ID);
    expect(secondDataset.dashboardId).toBe(DASHBOARD_B_ID);
  });

  it("looks up the dashboard dataset pair and downloads from its bucket", async () => {
    const parquetBlob = new Blob(["private snapshot"]);
    downloadDatasetMock.mockResolvedValue(parquetBlob);

    await LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      snapshotRevision: SNAPSHOT_REVISION,
    });

    expect(getByIdMock).toHaveBeenCalledWith({
      id: [DASHBOARD_A_ID, DATASET_ID],
    });
    expect(downloadDatasetMock).toHaveBeenCalledWith({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      snapshotRevision: SNAPSHOT_REVISION,
      throwIfNotFound: true,
    });
  });

  it("redownloads a dashboard dataset when its cached bucket is stale", async () => {
    const parquetBlob = new Blob(["workspace snapshot"]);
    getByIdMock.mockResolvedValue({
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      snapshotRevision: SNAPSHOT_REVISION,
      bucket: PUBLIC_BUCKET,
      parquetData: new Blob(["public snapshot"]),
      downloadedAt: new Date().toISOString(),
    });
    downloadDatasetMock.mockResolvedValue(parquetBlob);

    await LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      snapshotRevision: SNAPSHOT_REVISION,
    });

    expect(downloadDatasetMock).toHaveBeenCalledWith({
      bucket: PRIVATE_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      snapshotRevision: SNAPSHOT_REVISION,
      throwIfNotFound: true,
    });
    expect(insertMock).toHaveBeenCalledWith({
      upsert: true,
      data: expect.objectContaining({
        bucket: PRIVATE_BUCKET,
        parquetData: parquetBlob,
      }),
    });
  });

  it("redownloads a same-bucket dataset from an older publication", async () => {
    const parquetBlob = new Blob(["republished snapshot"]);
    getByIdMock.mockResolvedValue({
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      bucket: PUBLIC_BUCKET,
      snapshotRevision: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      parquetData: new Blob(["obsolete snapshot"]),
      downloadedAt: new Date().toISOString(),
    });
    downloadDatasetMock.mockResolvedValue(parquetBlob);

    await LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB({
      bucket: PUBLIC_BUCKET,
      dashboardId: DASHBOARD_A_ID,
      datasetId: DATASET_ID,
      snapshotRevision: SNAPSHOT_REVISION,
    });

    expect(downloadDatasetMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith({
      upsert: true,
      data: expect.objectContaining({
        snapshotRevision: SNAPSHOT_REVISION,
        parquetData: parquetBlob,
      }),
    });
  });

  it("does not join in-flight downloads from another bucket", async () => {
    downloadDatasetMock.mockImplementation(
      async ({ bucket }: { bucket: string }) => {
        return new Blob([bucket]);
      },
    );

    await Promise.all([
      LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB({
        bucket: PUBLIC_BUCKET,
        dashboardId: DASHBOARD_A_ID,
        datasetId: DATASET_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      }),
      LocalPublicDatasetClient.fetchPublicDatasetToIndexedDB({
        bucket: PRIVATE_BUCKET,
        dashboardId: DASHBOARD_A_ID,
        datasetId: DATASET_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      }),
    ]);

    expect(downloadDatasetMock).toHaveBeenCalledTimes(2);
  });
});
