/**
 * Shared mocks and helpers for the DuckDbClient ownership and leasing
 * tests. Each scenario file imports this first so its `vi.mock` calls are
 * registered before the DuckDB module graph loads.
 */
import { expect, vi } from "vitest";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PublicSnapshotDuckDbOwner } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";

export const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
export const SECOND_DATASET_ID =
  "33333333-3333-4333-8333-333333333333" as Dataset.Id;
export const DASHBOARD_ID =
  "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
export const PUBLIC_OWNER = {
  bucket: "published",
  dashboardId: DASHBOARD_ID,
  snapshotRevision: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
} as const satisfies PublicSnapshotDuckDbOwner;

/** A promise plus the resolver a test uses to release it. */
export type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

export function createDeferred(): Deferred {
  let resolvePromise = () => {};
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

export function stubWorker(): void {
  vi.stubGlobal(
    "Worker",
    class {
      addEventListener(): void {}

      terminate(): void {}
    },
  );
}

/** Loads the client and coordinator after the current module reset. */
export async function importDuckDbModules(): Promise<{
  DuckDbClient: (typeof import("@/clients/DuckDbClient/DuckDbClient"))["DuckDbClient"];
  DatasetDuckDbCoordinator: (typeof import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator"))["DatasetDuckDbCoordinator"];
}> {
  const [{ DuckDbClient }, { DatasetDuckDbCoordinator }] = await Promise.all([
    import("@/clients/DuckDbClient/DuckDbClient"),
    import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator"),
  ]);
  return { DuckDbClient, DatasetDuckDbCoordinator };
}

export async function waitForQueuedOperations(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

export async function assertOperationBlocksLaterWork(
  options: Readonly<{
    operationStarted: Deferred;
    releaseOperation: Deferred;
    operationPromise: Promise<unknown>;
    expectedError?: string;
  }>,
): Promise<void> {
  const { DatasetDuckDbCoordinator } = await importDuckDbModules();
  await options.operationStarted.promise;
  let hasLaterOperationStarted = false;
  const laterOperation =
    DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [DATASET_ID],
      operation: async () => {
        hasLaterOperationStarted = true;
      },
    });
  await waitForQueuedOperations();
  expect(hasLaterOperationStarted).toBe(false);
  options.releaseOperation.resolve();
  if (options.expectedError !== undefined) {
    await expect(options.operationPromise).rejects.toThrow(
      options.expectedError,
    );
  } else {
    await options.operationPromise;
  }
  await laterOperation;
  expect(hasLaterOperationStarted).toBe(true);
}

export async function assertUnleasedDropDoesNotDeadlock(
  options: Readonly<{
    relationType: string;
    hasView: boolean;
    hasTable: boolean;
  }>,
): Promise<void> {
  vi.resetModules();
  stubWorker();
  const dropQueryStarted = createDeferred();
  queryMock.mockImplementation(async (sql: string) => {
    if (sql.startsWith(`DROP ${options.relationType.toUpperCase()}`)) {
      dropQueryStarted.resolve();
    }
    return {
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    };
  });
  const { DuckDbClient } = await importDuckDbModules();
  vi.spyOn(DuckDbClient, "hasView").mockResolvedValue(options.hasView);
  vi.spyOn(DuckDbClient, "hasTable").mockResolvedValue(options.hasTable);
  const dropPromise = DuckDbClient.dropTableViewAndFile({
    tableOrViewName: DATASET_ID,
  });
  const hasDropQueryStarted = await Promise.race([
    dropQueryStarted.promise.then(() => {
      return true;
    }),
    new Promise<false>((resolve) => {
      setTimeout(() => {
        return resolve(false);
      }, 0);
    }),
  ]);
  expect(hasDropQueryStarted).toBe(true);
  await dropPromise;
}

const { dropFileMock, queryMock, registerFileHandleMock } = vi.hoisted(() => {
  return {
    dropFileMock: vi.fn(),
    queryMock: vi.fn(),
    registerFileHandleMock: vi.fn(),
  };
});

vi.mock("@/clients/DuckDbClient/duckDbManualBundles", () => {
  return {
    buildManualDuckDbBundles: () => {
      return {};
    },
  };
});

vi.mock("@/clients/DuckDbClient/shouldLoadDuckDbNetworkExtensions", () => {
  return {
    shouldLoadDuckDbNetworkExtensions: () => {
      return false;
    },
  };
});

vi.mock("@/config/FeatureFlagConfig", () => {
  return {
    FeatureFlag: { DisableDuckDbSpatial: "disable-duckdb-spatial" },
    isFlagEnabled: () => {
      return false;
    },
  };
});

vi.mock("@/utils/Logger", () => {
  const logger = {
    appendName: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  };
  logger.appendName.mockReturnValue(logger);
  return { Logger: logger };
});

vi.mock("@duckdb/duckdb-wasm", () => {
  const connection = {
    close: vi.fn(),
    query: queryMock,
  };

  class MockAsyncDuckDb {
    connect = vi.fn(async () => {
      return connection;
    });

    dropFile = dropFileMock;

    registerFileHandle = registerFileHandleMock;

    instantiate = vi.fn();

    terminate = vi.fn();
  }

  return {
    AsyncDuckDB: MockAsyncDuckDb,
    ConsoleLogger: class {},
    DuckDBDataProtocol: { BROWSER_FILEREADER: 0 },
    selectBundle: vi.fn(async () => {
      return { mainModule: "duckdb.wasm", mainWorker: "duckdb.worker.js" };
    }),
  };
});

/** Clears every DuckDB mock between scenarios. */
export function resetDuckDbOwnershipMocks(): void {
  vi.clearAllMocks();
  dropFileMock.mockReset();
  queryMock.mockReset();
  registerFileHandleMock.mockReset();
  vi.unstubAllGlobals();
}

export { dropFileMock, queryMock, registerFileHandleMock };
