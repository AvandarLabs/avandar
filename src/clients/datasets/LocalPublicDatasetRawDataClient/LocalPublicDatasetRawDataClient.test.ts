import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DASHBOARD_A_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const DASHBOARD_B_ID = "33333333-3333-4333-8333-333333333333" as Dashboard.Id;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const PRIVATE_BUCKET = "published-private" as const;
const PUBLIC_BUCKET = "published" as const;
const FIRST_REVISION = "2026-08-14T00:00:00.000Z";
const SECOND_REVISION = "2026-08-14T01:00:00.000Z";

type Deferred<Value> = {
  promise: Promise<Value>;
  resolve: (value: Value | PromiseLike<Value>) => void;
};

function _createDeferred<Value>(): Deferred<Value> {
  let resolvePromise: Deferred<Value>["resolve"] = () => {};
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

async function _flushMicrotasks(): Promise<void> {
  for (let iteration = 0; iteration < 10; iteration += 1) {
    await Promise.resolve();
  }
}

const {
  dropTableViewAndFileMock,
  fetchPublicDatasetToIndexedDBMock,
  getByIdMock,
  hasTableOrViewMock,
  loadParquetMock,
  loggerMock,
} = vi.hoisted(() => {
  const mockedLogger = { appendName: vi.fn(), log: vi.fn() };
  mockedLogger.appendName.mockReturnValue(mockedLogger);

  return {
    dropTableViewAndFileMock: vi.fn(),
    fetchPublicDatasetToIndexedDBMock: vi.fn(),
    getByIdMock: vi.fn(),
    hasTableOrViewMock: vi.fn(),
    loadParquetMock: vi.fn(),
    loggerMock: mockedLogger,
  };
});

vi.mock("@avandar/clients", () => {
  return {
    createServiceClient: () => {
      return {};
    },
  };
});

vi.mock("@avandar/logger", () => {
  return {
    withLogger: (
      _client: object,
      builder: (logger: typeof loggerMock) => object,
    ) => {
      return builder(loggerMock);
    },
  };
});

vi.mock("@avandar/query-hooks", () => {
  return {
    withQueryHooks: (client: object) => {
      return client;
    },
  };
});

vi.mock("@avandar/utils", () => {
  return {
    isDefined: <Value>(value: Value | undefined): value is Value => {
      return value !== undefined;
    },
    promiseMap: async <Value, Result>(
      values: readonly Value[],
      mapper: (value: Value) => Promise<Result>,
    ) => {
      return await Promise.all(values.map(mapper));
    },
  };
});

vi.mock(
  "@/clients/datasets/LocalPublicDatasetClient/LocalPublicDatasetClient",
  () => {
    return {
      LocalPublicDatasetClient: {
        fetchPublicDatasetToIndexedDB: fetchPublicDatasetToIndexedDBMock,
        getById: getByIdMock,
      },
    };
  },
);

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      dropTableViewAndFile: dropTableViewAndFileMock,
      hasTableOrView: hasTableOrViewMock,
      loadParquet: loadParquetMock,
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  getByIdMock.mockResolvedValue({
    bucket: PRIVATE_BUCKET,
    snapshotRevision: FIRST_REVISION,
    parquetData: new Blob(["cached snapshot"]),
  });
  fetchPublicDatasetToIndexedDBMock.mockResolvedValue({
    parquetData: new Blob(["downloaded snapshot"]),
  });
  hasTableOrViewMock.mockResolvedValue(false);
  loadParquetMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function _getClient(): Promise<
  typeof import("@/clients/datasets/LocalPublicDatasetRawDataClient/LocalPublicDatasetRawDataClient")
> {
  vi.resetModules();
  return await import("@/clients/datasets/LocalPublicDatasetRawDataClient/LocalPublicDatasetRawDataClient");
}

function _configureRevisionRace(firstLoad: Deferred<void>): {
  getLoadedRevision: () => string | undefined;
} {
  let loadedRevision: string | undefined;
  const firstRevisionBlob = new Blob([FIRST_REVISION]);
  const secondRevisionBlob = new Blob([SECOND_REVISION]);
  getByIdMock
    .mockResolvedValueOnce({
      bucket: PUBLIC_BUCKET,
      snapshotRevision: FIRST_REVISION,
      parquetData: firstRevisionBlob,
    })
    .mockResolvedValueOnce({
      bucket: PUBLIC_BUCKET,
      snapshotRevision: SECOND_REVISION,
      parquetData: secondRevisionBlob,
    });
  hasTableOrViewMock.mockResolvedValue(false);
  loadParquetMock.mockImplementation(async ({ blob }: { blob: Blob }) => {
    if (blob === firstRevisionBlob) {
      await firstLoad.promise;
      loadedRevision = FIRST_REVISION;
      return;
    }
    loadedRevision = SECOND_REVISION;
  });
  return {
    getLoadedRevision: () => {
      return loadedRevision;
    },
  };
}

function _loadRevision(
  options: Readonly<{
    client: Awaited<
      ReturnType<typeof _getClient>
    >["LocalPublicDatasetRawDataClient"];
    snapshotRevision: string;
  }>,
): ReturnType<
  Awaited<
    ReturnType<typeof _getClient>
  >["LocalPublicDatasetRawDataClient"]["loadDatasetsToMemory"]
> {
  return options.client.loadDatasetsToMemory({
    bucket: PUBLIC_BUCKET,
    dashboardId: DASHBOARD_A_ID,
    datasetIds: [DATASET_ID],
    snapshotRevision: options.snapshotRevision,
  });
}

describe("LocalPublicDatasetRawDataClient.loadDatasetsToMemory", () => {
  it("reloads a dataset table when a different dashboard owns the loaded slice", async () => {
    const { LocalPublicDatasetRawDataClient } = await _getClient();
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
    const { LocalPublicDatasetRawDataClient } = await _getClient();
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
    const { LocalPublicDatasetRawDataClient } = await _getClient();
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
    const { LocalPublicDatasetRawDataClient } = await _getClient();
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
    const { LocalPublicDatasetRawDataClient } = await _getClient();
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

  it("removes a partially created table when a public load fails", async () => {
    const loadError = new Error("load failed after creating the view");
    loadParquetMock.mockRejectedValue(loadError);
    const { LocalPublicDatasetRawDataClient } = await _getClient();

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
    const { LocalPublicDatasetRawDataClient } = await _getClient();

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
    const firstLoad = _createDeferred<void>();
    const { getLoadedRevision } = _configureRevisionRace(firstLoad);
    const { LocalPublicDatasetRawDataClient } = await _getClient();
    const firstRevisionPromise = _loadRevision({
      client: LocalPublicDatasetRawDataClient,
      snapshotRevision: FIRST_REVISION,
    });
    await vi.waitFor(() => {
      expect(loadParquetMock).toHaveBeenCalledTimes(1);
    });

    const secondRevisionPromise = _loadRevision({
      client: LocalPublicDatasetRawDataClient,
      snapshotRevision: SECOND_REVISION,
    });
    await _flushMicrotasks();
    firstLoad.resolve();

    await Promise.all([firstRevisionPromise, secondRevisionPromise]);

    expect(getLoadedRevision()).toBe(SECOND_REVISION);
  });
});
