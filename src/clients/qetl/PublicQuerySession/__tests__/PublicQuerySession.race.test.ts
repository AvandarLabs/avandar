import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const FIRST_REVISION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECOND_REVISION = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PUBLIC_BUCKET = "published" as const;

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

async function _flushMicrotasks(numRemaining = 20): Promise<void> {
  if (numRemaining === 0) {
    return;
  }
  await Promise.resolve();
  await _flushMicrotasks(numRemaining - 1);
}

const {
  bulkInsertMock,
  createQetlClientMock,
  dropTableViewAndFileMock,
  fetchPublicDatasetToIndexedDBMock,
  getByIdMock,
  hasTableOrViewMock,
  listDatasetIdsForDashboardMock,
  loadParquetMock,
  loggerMock,
} = vi.hoisted(() => {
  const mockedLogger = { appendName: vi.fn(), log: vi.fn() };
  mockedLogger.appendName.mockReturnValue(mockedLogger);

  return {
    bulkInsertMock: vi.fn(),
    createQetlClientMock: vi.fn(),
    dropTableViewAndFileMock: vi.fn(),
    fetchPublicDatasetToIndexedDBMock: vi.fn(),
    getByIdMock: vi.fn(),
    hasTableOrViewMock: vi.fn(),
    listDatasetIdsForDashboardMock: vi.fn(),
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

vi.mock("@avandar/modules", () => {
  return {
    createModule: (_name: string, options: { builder: () => object }) => {
      return options.builder();
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
    prop: <Key extends PropertyKey>(key: Key) => {
      return <Value extends Record<Key, unknown>>(value: Value) => {
        return value[key];
      };
    },
    propEq: <Key extends PropertyKey>(key: Key, expectedValue: unknown) => {
      return <Value extends Record<Key, unknown>>(value: Value) => {
        return value[key] === expectedValue;
      };
    },
    propIsDefined: <Key extends PropertyKey>(key: Key) => {
      return <Value extends Record<Key, unknown>>(value: Value) => {
        return value[key] !== undefined;
      };
    },
    promiseMap: async <Value, Result>(
      values: readonly Value[],
      mapper: (value: Value) => Promise<Result>,
    ) => {
      return await Promise.all(values.map(mapper));
    },
  };
});

vi.mock("@/clients/qetl/QueryMediator/QueryMediator", () => {
  return { QueryMediatorFactory: { create: createQetlClientMock } };
});

vi.mock(
  "@/clients/datasets/LocalPublicDatasetClient/LocalPublicDatasetClient",
  () => {
    return {
      LocalPublicDatasetClient: {
        bulkInsert: bulkInsertMock,
        fetchPublicDatasetToIndexedDB: fetchPublicDatasetToIndexedDBMock,
        getById: getByIdMock,
      },
    };
  },
);

vi.mock(
  "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient",
  () => {
    return {
      PublicDatasetParquetStorageClient: {
        listDatasetIdsForDashboard: listDatasetIdsForDashboardMock,
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
  getByIdMock.mockResolvedValue(undefined);
  listDatasetIdsForDashboardMock.mockResolvedValue([DATASET_ID]);
});

type SnapshotState = {
  hasSecondLoadStarted: boolean;
  loadedRevision: string | undefined;
};

type QetlOptions = {
  getQueryDependencies: (rawSql: string) => Promise<Dataset.Id[]>;
  prepareDuckDbDatasets: (params: {
    datasetIds: readonly Dataset.Id[];
    datasetDuckDbLease: unknown;
  }) => Promise<void>;
};

function _configureSnapshotStorage(state: SnapshotState): void {
  hasTableOrViewMock.mockImplementation(async () => {
    return state.loadedRevision !== undefined;
  });
  dropTableViewAndFileMock.mockImplementation(async () => {
    state.loadedRevision = undefined;
  });
  const revisionByBlob = new WeakMap<Blob, string>();
  fetchPublicDatasetToIndexedDBMock.mockImplementation(
    async ({ snapshotRevision }: { snapshotRevision: string }) => {
      const parquetData = new Blob();
      revisionByBlob.set(parquetData, snapshotRevision);
      return { parquetData };
    },
  );
  loadParquetMock.mockImplementation(async ({ blob }: { blob: Blob }) => {
    const snapshotRevision = revisionByBlob.get(blob);
    if (snapshotRevision === SECOND_REVISION) {
      state.hasSecondLoadStarted = true;
    }
    state.loadedRevision = snapshotRevision;
  });
}

function _configureCoordinatedQuery(
  executeQuery: () => Promise<unknown>,
): void {
  createQetlClientMock.mockImplementation((options: QetlOptions) => {
    return {
      runQuery: async ({ rawSql }: { rawSql: string }) => {
        const datasetIds = await options.getQueryDependencies(rawSql);
        const { DatasetDuckDbCoordinator } =
          await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
        const { runCoordinatedDatasetDuckDbOperation } =
          DatasetDuckDbCoordinator;
        return await runCoordinatedDatasetDuckDbOperation({
          datasetIds,
          operation: async (datasetDuckDbLease) => {
            await options.prepareDuckDbDatasets({
              datasetIds,
              datasetDuckDbLease,
            });
            return await executeQuery();
          },
        });
      },
    };
  });
}

async function _getPublicSnapshotClients() {
  const [{ LocalPublicDatasetRawDataClient }, { PublicQuerySession }] =
    await Promise.all([
      import("@/clients/datasets/LocalPublicDatasetRawDataClient/LocalPublicDatasetRawDataClient"),
      import("@/clients/qetl/PublicQuerySession/PublicQuerySession"),
    ]);
  return { LocalPublicDatasetRawDataClient, PublicQuerySession };
}

function _loadRevision(
  options: Readonly<{
    client: Awaited<
      ReturnType<typeof _getPublicSnapshotClients>
    >["LocalPublicDatasetRawDataClient"];
    snapshotRevision: string;
  }>,
): ReturnType<
  Awaited<
    ReturnType<typeof _getPublicSnapshotClients>
  >["LocalPublicDatasetRawDataClient"]["loadDatasetsToMemory"]
> {
  return options.client.loadDatasetsToMemory({
    bucket: PUBLIC_BUCKET,
    dashboardId: DASHBOARD_ID,
    datasetIds: [DATASET_ID],
    snapshotRevision: options.snapshotRevision,
  });
}

describe("public snapshot DuckDB coordination", () => {
  it("finishes revision A query before revision B replaces its bare table", async () => {
    vi.resetModules();
    const queryStarted = _createDeferred<void>();
    const queryMayFinish = _createDeferred<void>();
    const state: SnapshotState = {
      hasSecondLoadStarted: false,
      loadedRevision: undefined,
    };
    _configureSnapshotStorage(state);
    _configureCoordinatedQuery(async () => {
      queryStarted.resolve();
      await queryMayFinish.promise;
      return { data: [{ snapshotRevision: state.loadedRevision }] };
    });
    const { LocalPublicDatasetRawDataClient, PublicQuerySession } =
      await _getPublicSnapshotClients();
    await _loadRevision({
      client: LocalPublicDatasetRawDataClient,
      snapshotRevision: FIRST_REVISION,
    });
    const firstRevisionQuery = PublicQuerySession.runQuery({
      rawSql: `select * from "${DATASET_ID}"`,
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      snapshotRevision: FIRST_REVISION,
    });
    await queryStarted.promise;

    const secondRevisionLoad = _loadRevision({
      client: LocalPublicDatasetRawDataClient,
      snapshotRevision: SECOND_REVISION,
    });
    await _flushMicrotasks();

    expect(state.hasSecondLoadStarted).toBe(false);
    queryMayFinish.resolve();
    await expect(firstRevisionQuery).resolves.toEqual({
      data: [{ snapshotRevision: FIRST_REVISION }],
    });

    await secondRevisionLoad;
    expect(state.loadedRevision).toBe(SECOND_REVISION);
  });

  it("rejects revision A after revision B owns the bare table", async () => {
    vi.resetModules();
    const state: SnapshotState = {
      hasSecondLoadStarted: false,
      loadedRevision: undefined,
    };
    const runQueryMock = vi.fn(async () => {
      return { data: [{ snapshotRevision: state.loadedRevision }] };
    });
    _configureSnapshotStorage(state);
    _configureCoordinatedQuery(runQueryMock);
    const { LocalPublicDatasetRawDataClient, PublicQuerySession } =
      await _getPublicSnapshotClients();
    await _loadRevision({
      client: LocalPublicDatasetRawDataClient,
      snapshotRevision: SECOND_REVISION,
    });
    await expect(
      PublicQuerySession.runQuery({
        rawSql: `select * from "${DATASET_ID}"`,
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        snapshotRevision: FIRST_REVISION,
      }),
    ).rejects.toThrow("snapshot tables changed before query execution");
    expect(runQueryMock).not.toHaveBeenCalled();
  });
});
