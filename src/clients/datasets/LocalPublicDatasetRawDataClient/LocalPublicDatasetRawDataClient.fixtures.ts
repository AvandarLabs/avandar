/**
 * Shared mocks and helpers for the LocalPublicDatasetRawDataClient tests.
 * Scenario files import this first so its `vi.mock` calls are registered
 * before the client module graph loads.
 */
import { vi } from "vitest";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

export const DASHBOARD_A_ID =
  "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
export const DASHBOARD_B_ID =
  "33333333-3333-4333-8333-333333333333" as Dashboard.Id;
export const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
export const PRIVATE_BUCKET = "published-private" as const;
export const PUBLIC_BUCKET = "published" as const;
export const FIRST_REVISION = "2026-08-14T00:00:00.000Z";
export const SECOND_REVISION = "2026-08-14T01:00:00.000Z";

/** A promise plus the resolver a test uses to release it. */
export type Deferred<Value> = {
  promise: Promise<Value>;
  resolve: (value: Value | PromiseLike<Value>) => void;
};

export function createDeferred<Value>(): Deferred<Value> {
  let resolvePromise: Deferred<Value>["resolve"] = () => {};
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

/** Lets every already-queued microtask settle before asserting. */
export async function flushMicrotasks(): Promise<void> {
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

/** Resets every raw-data mock to its default state. */
export function setUpRawDataMocks(): void {
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
}

/** Restores real timers and globals after a scenario. */
export function tearDownRawDataMocks(): void {
  vi.clearAllMocks();
}

export async function getRawDataClient(): Promise<
  typeof import("@/clients/datasets/LocalPublicDatasetRawDataClient/LocalPublicDatasetRawDataClient")
> {
  vi.resetModules();
  return await import("@/clients/datasets/LocalPublicDatasetRawDataClient/LocalPublicDatasetRawDataClient");
}

export function configureRevisionRace(firstLoad: Deferred<void>): {
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

export function loadRevision(
  options: Readonly<{
    client: Awaited<
      ReturnType<typeof getRawDataClient>
    >["LocalPublicDatasetRawDataClient"];
    snapshotRevision: string;
  }>,
): ReturnType<
  Awaited<
    ReturnType<typeof getRawDataClient>
  >["LocalPublicDatasetRawDataClient"]["loadDatasetsToMemory"]
> {
  return options.client.loadDatasetsToMemory({
    bucket: PUBLIC_BUCKET,
    dashboardId: DASHBOARD_A_ID,
    datasetIds: [DATASET_ID],
    snapshotRevision: options.snapshotRevision,
  });
}

export {
  dropTableViewAndFileMock,
  fetchPublicDatasetToIndexedDBMock,
  getByIdMock,
  hasTableOrViewMock,
  loadParquetMock,
  loggerMock,
};
