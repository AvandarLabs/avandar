/** Tests QETL dataset leases through final DuckDB query execution. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const VIRTUAL_DATASET_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const SECOND_VIRTUAL_DATASET_ID =
  "44444444-4444-4444-8444-444444444444" as Dataset.Id;

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

function _createDeferred(): Deferred {
  let resolvePromise = () => {};
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

const {
  datasetColumnGetAllMock,
  datasetGetAllMock,
  getTableOrViewNamesMock,
  loadParquetMock,
  localDatasetGetByIdMock,
  localDatasetGetAllMock,
  runRawQueryMock,
  sourceDatasetGetAllMock,
} = vi.hoisted(() => {
  return {
    datasetColumnGetAllMock: vi.fn(),
    datasetGetAllMock: vi.fn(),
    getTableOrViewNamesMock: vi.fn(),
    loadParquetMock: vi.fn(),
    localDatasetGetByIdMock: vi.fn(),
    localDatasetGetAllMock: vi.fn(),
    runRawQueryMock: vi.fn(),
    sourceDatasetGetAllMock: vi.fn(),
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      dropTableViewAndFile: vi.fn(),
      getTableOrViewNames: getTableOrViewNamesMock,
      loadParquet: loadParquetMock,
      runRawQuery: runRawQueryMock,
    },
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      getById: localDatasetGetByIdMock,
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: localDatasetGetAllMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: datasetGetAllMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/datasets/source-datasets/CsvFileDatasetClient", () => {
  return {
    CsvFileDatasetClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: sourceDatasetGetAllMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return {
    VirtualDatasetClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: sourceDatasetGetAllMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: datasetColumnGetAllMock };
          },
        };
      },
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  getTableOrViewNamesMock.mockResolvedValue([DATASET_ID]);
  localDatasetGetAllMock.mockResolvedValue([]);
  localDatasetGetByIdMock.mockResolvedValue(undefined);
  datasetColumnGetAllMock.mockResolvedValue([]);
  datasetGetAllMock.mockResolvedValue([]);
  loadParquetMock.mockResolvedValue({});
  sourceDatasetGetAllMock.mockResolvedValue([]);
});

async function _assertWriterWaitsForQuery(
  options: Readonly<{
    queryMayFinish: Deferred;
    queryPromise: Promise<unknown>;
    queryStarted: Deferred;
  }>,
): Promise<void> {
  const { DatasetDuckDbCoordinator } =
    await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
  await options.queryStarted.promise;
  let hasWriterStarted = false;
  const writerPromise =
    DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [DATASET_ID],
      operation: async () => {
        hasWriterStarted = true;
      },
    });
  await Promise.resolve();
  await Promise.resolve();
  expect(hasWriterStarted).toBe(false);
  options.queryMayFinish.resolve();
  await Promise.all([options.queryPromise, writerPromise]);
  expect(hasWriterStarted).toBe(true);
}

function _configureVirtualDependencyMocks(workspaceId: string): void {
  const baseDataset = {
    id: DATASET_ID,
    name: "base",
    sourceType: "csv_file" as const,
    workspaceId,
  };
  const virtualDataset = {
    id: VIRTUAL_DATASET_ID,
    name: "virtual",
    sourceType: "virtual" as const,
    workspaceId,
  };
  datasetGetAllMock
    .mockResolvedValueOnce([virtualDataset, baseDataset])
    .mockResolvedValueOnce([baseDataset]);
  sourceDatasetGetAllMock
    .mockResolvedValueOnce([
      {
        datasetId: VIRTUAL_DATASET_ID,
        rawSql: `SELECT * FROM "${DATASET_ID}"`,
      },
    ])
    .mockResolvedValue([{ datasetId: DATASET_ID }]);
  localDatasetGetByIdMock.mockImplementation(async ({ id }) => {
    return id === VIRTUAL_DATASET_ID ? undefined : (
        { parseStatus: "ready", parquetData: new Blob(["cached"]) }
      );
  });
  getTableOrViewNamesMock.mockResolvedValue([]);
  runRawQueryMock.mockImplementation(async (_sql, options) => {
    return options?.returnType === "parquet" ?
        new Blob(["evaluated"])
      : { data: [] };
  });
}

function _configureVirtualSiblingData(workspaceId: string): void {
  const baseDataset = {
    id: DATASET_ID,
    name: "base",
    sourceType: "csv_file" as const,
    workspaceId,
  };
  const virtualDatasets = [VIRTUAL_DATASET_ID, SECOND_VIRTUAL_DATASET_ID].map(
    (id) => {
      return { id, name: id, sourceType: "virtual" as const, workspaceId };
    },
  );
  datasetGetAllMock
    .mockResolvedValueOnce(virtualDatasets)
    .mockResolvedValue([baseDataset]);
  sourceDatasetGetAllMock
    .mockResolvedValueOnce([
      {
        datasetId: VIRTUAL_DATASET_ID,
        rawSql: `SELECT 'first' FROM "${DATASET_ID}"`,
      },
      {
        datasetId: SECOND_VIRTUAL_DATASET_ID,
        rawSql: `SELECT 'second' FROM "${DATASET_ID}"`,
      },
    ])
    .mockResolvedValue([{ datasetId: DATASET_ID }]);
  localDatasetGetByIdMock.mockImplementation(async ({ id }) => {
    return id === DATASET_ID ?
        { parseStatus: "ready", parquetData: new Blob(["cached"]) }
      : undefined;
  });
  getTableOrViewNamesMock.mockResolvedValue([]);
}

function _configureVirtualSiblingQueries(
  options: Readonly<{
    firstQueryMayFinish: Deferred;
    firstQueryStarted: Deferred;
    state: { hasSecondQueryStarted: boolean };
  }>,
): void {
  runRawQueryMock.mockImplementation(async (rawSql, queryOptions) => {
    if (rawSql.includes("'first'")) {
      options.firstQueryStarted.resolve();
      await options.firstQueryMayFinish.promise;
    }
    if (rawSql.includes("'second'")) {
      options.state.hasSecondQueryStarted = true;
    }
    return queryOptions?.returnType === "parquet" ?
        new Blob(["virtual"])
      : { data: [] };
  });
}

describe("QueryMediator DuckDB coordination", () => {
  it("finishes a dataset query before a later writer can replace its table", async () => {
    const queryStarted = _createDeferred();
    const queryMayFinish = _createDeferred();
    runRawQueryMock.mockImplementation(async () => {
      queryStarted.resolve();
      await queryMayFinish.promise;
      return { data: [{ value: "workspace" }] };
    });
    const { QueryMediatorFactory } =
      await import("@/clients/qetl/QueryMediator/QueryMediator");
    const qetlClient = QueryMediatorFactory.create({
      getQueryDependencies: async () => {
        return [DATASET_ID];
      },
      insertToStorageCache: async () => {},
    });

    const queryPromise = qetlClient.runQuery({
      rawSql: `SELECT * FROM "${DATASET_ID}"`,
    });
    await _assertWriterWaitsForQuery({
      queryPromise,
      queryStarted,
      queryMayFinish,
    });
  });

  it("reuses an outer lease while materializing a virtual dependency", async () => {
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    _configureVirtualDependencyMocks(workspaceId);
    const { QueryMediatorFactory } =
      await import("@/clients/qetl/QueryMediator/QueryMediator");
    const qetlClient = QueryMediatorFactory.create({
      getQueryDependencies: async (rawSql) => {
        return rawSql.includes(VIRTUAL_DATASET_ID) ?
            [VIRTUAL_DATASET_ID]
          : [DATASET_ID];
      },
      getDuckDbLeaseDatasetIds: async () => {
        return [VIRTUAL_DATASET_ID, DATASET_ID];
      },
      insertToStorageCache: async () => {},
    });
    const completedBeforeTimeout = await Promise.race([
      qetlClient
        .runQuery({
          rawSql: `SELECT * FROM "${VIRTUAL_DATASET_ID}"`,
        })
        .then(() => {
          return true;
        }),
      new Promise<false>((resolve) => {
        setTimeout(() => {
          resolve(false);
        }, 100);
      }),
    ]);

    expect(completedBeforeTimeout).toBe(true);
  });

  it("serializes virtual siblings that materialize a shared base", async () => {
    const firstQueryStarted = _createDeferred();
    const firstQueryMayFinish = _createDeferred();
    const queryState = { hasSecondQueryStarted: false };
    const workspaceId = "11111111-1111-4111-8111-111111111111";
    _configureVirtualSiblingData(workspaceId);
    _configureVirtualSiblingQueries({
      firstQueryStarted,
      firstQueryMayFinish,
      state: queryState,
    });
    const { QueryMediatorFactory } =
      await import("@/clients/qetl/QueryMediator/QueryMediator");
    const qetlClient = QueryMediatorFactory.create({
      getQueryDependencies: async (rawSql) => {
        return rawSql.includes(VIRTUAL_DATASET_ID) ?
            [VIRTUAL_DATASET_ID, SECOND_VIRTUAL_DATASET_ID]
          : [DATASET_ID];
      },
      getDuckDbLeaseDatasetIds: async () => {
        return [VIRTUAL_DATASET_ID, SECOND_VIRTUAL_DATASET_ID, DATASET_ID];
      },
      insertToStorageCache: async () => {},
    });
    const queryPromise = qetlClient.runQuery({
      rawSql: `SELECT * FROM "${VIRTUAL_DATASET_ID}" JOIN "${SECOND_VIRTUAL_DATASET_ID}" ON true`,
    });
    await firstQueryStarted.promise;
    await Promise.resolve();
    await Promise.resolve();
    const didSecondStartWhileFirstWasDeferred =
      queryState.hasSecondQueryStarted;
    firstQueryMayFinish.resolve();
    await queryPromise;

    expect(didSecondStartWhileFirstWasDeferred).toBe(false);
  });
});
