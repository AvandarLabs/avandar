/** Pins that a query reports each dataset it loads once, wherever from. */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryableRelationColumns } from "@/clients/qetl/QueryMediator/QueryableRelationColumns/QueryableRelationColumns";
import { createInMemoryRelationCache } from "@/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryMediatorFactory as QueryMediatorFactoryType } from "@/clients/qetl/QueryMediator/QueryMediator";

const IN_DUCKDB_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const STORED_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const SOURCED_ID = "44444444-4444-4444-8444-444444444444" as Dataset.Id;
const VIRTUAL_ID = "55555555-5555-4555-8555-555555555555" as Dataset.Id;
const NESTED_SQL = `SELECT * FROM "${STORED_ID}"`;
const PRINCIPAL_KEY = "w:11111111-1111-4111-8111-111111111111:user";

let relationCache = createInMemoryRelationCache();

const {
  datasetColumnGetAllMock,
  datasetGetAllMock,
  getRelationSourcesMock,
  getTableOrViewNamesMock,
  loadParquetMock,
  runRawQueryMock,
} = vi.hoisted(() => {
  return {
    datasetColumnGetAllMock: vi.fn(),
    datasetGetAllMock: vi.fn(),
    getRelationSourcesMock: vi.fn(),
    getTableOrViewNamesMock: vi.fn(),
    loadParquetMock: vi.fn(),
    runRawQueryMock: vi.fn(),
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

// Mocked as relationCacheOrdering mocks them: the wrappers import both, and
// neither may touch IndexedDB or the network here.
vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      getById: vi.fn(async () => {
        return undefined;
      }),
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return {
              getAll: vi.fn(async () => {
                return [];
              }),
            };
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
            return {
              getAll: vi.fn(async () => {
                return [];
              }),
            };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      QueryKeys: {
        getAll: () => {
          return ["DatasetColumnClient", "getAll"];
        },
      },
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: datasetColumnGetAllMock };
          },
          withFetchQuery: () => {
            return { getAll: datasetColumnGetAllMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", async () => {
  return (
    await import("@/lib/dataDictionaries/loadColumnReplacements/__tests__/noDictionaryBindingsClient")
  ).NO_DICTIONARY_BINDINGS_CLIENT_MODULE;
});

vi.mock(
  "@/clients/qetl/QueryMediator/relationLoading/getVirtualRelationDefinitions/getVirtualRelationDefinitions",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/clients/qetl/QueryMediator/relationLoading/getVirtualRelationDefinitions/getVirtualRelationDefinitions")
      >();
    return {
      ...original,
      getVirtualRelationDefinitions: async () => {
        return {};
      },
    };
  },
);

// The source records and the wrappers that acquire them are controlled here,
// so a dataset can come from its source, and a virtual one can run a nested
// query through the real registry wiring.
vi.mock(
  "@/clients/qetl/QueryMediator/getRelationSources",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/clients/qetl/QueryMediator/getRelationSources")
      >();
    return { ...original, getRelationSources: getRelationSourcesMock };
  },
);

vi.mock("@/clients/qetl/wrappers/createDefaultRegistry", () => {
  return {
    createDefaultRegistry: (options: {
      runParquetQuery: (query: { rawSql: string }) => Promise<unknown>;
    }) => {
      return {
        resolve: (ref: { id: string }) => {
          return {
            acquire: async () => {
              const nested =
                ref.id === VIRTUAL_ID
                  ? await options.runParquetQuery({ rawSql: NESTED_SQL })
                  : undefined;
              return {
                parquetBlob:
                  (nested as { parquetBlob?: Blob } | undefined)?.parquetBlob ??
                  new Blob(["source"]),
                sourceVersion: undefined,
                maxAgeMs: undefined,
              };
            },
          };
        },
      };
    },
  };
});

// Imported once, outside any test's time budget, as relationCacheOrdering does.
let QueryMediatorFactory: typeof QueryMediatorFactoryType;

beforeAll(async () => {
  ({ QueryMediatorFactory } =
    await import("@/clients/qetl/QueryMediator/QueryMediator"));
});

beforeEach(async () => {
  vi.clearAllMocks();
  QueryableRelationColumns.clear();
  relationCache = createInMemoryRelationCache();
  datasetGetAllMock.mockResolvedValue([]);
  datasetColumnGetAllMock.mockResolvedValue([]);
  loadParquetMock.mockResolvedValue({});
  runRawQueryMock.mockImplementation(
    async (_sql: string, options?: { returnType?: string }) => {
      return options?.returnType === "parquet"
        ? new Blob(["nested"])
        : { data: [] };
    },
  );
  getRelationSourcesMock.mockResolvedValue([]);
  // One dataset is already in DuckDB, recorded with every column and no
  // projection, so the queryable tier serves it.
  getTableOrViewNamesMock.mockResolvedValue([IN_DUCKDB_ID]);
  QueryableRelationColumns.remember({
    datasetId: IN_DUCKDB_ID,
    columns: "all",
    staleAt: undefined,
  });
  // The other is in the storage tier.
  await relationCache.write({
    identity: {
      principal: PRINCIPAL_KEY,
      relation: { kind: "dataset", id: STORED_ID },
      definition: undefined,
      sourceVersion: undefined,
    },
    columns: "all",
    payload: new Blob(["stored"]),
    staleAt: undefined,
  });
});

function _createMediator(
  dependenciesBySql: Readonly<Record<string, readonly Dataset.Id[]>>,
) {
  const getDependencies = async (rawSql: string): Promise<Dataset.Id[]> => {
    return [...(dependenciesBySql[rawSql] ?? [])];
  };
  return QueryMediatorFactory.create("QueryMediator", {
    state: {
      getQueryDependencies: getDependencies,
      getDuckDbLeaseDatasetIds: async () => {
        return [IN_DUCKDB_ID, STORED_ID, SOURCED_ID, VIRTUAL_ID];
      },
      relationCache,
      principalKey: PRINCIPAL_KEY,
    },
  });
}

describe("QueryMediator relation progress", () => {
  it("reports a dataset DuckDB serves and one the storage tier serves, once each", async () => {
    const onRelationFetched = vi.fn();
    const mediator = _createMediator({
      "SELECT 1": [IN_DUCKDB_ID, STORED_ID],
    });

    await mediator.runQuery({ rawSql: "SELECT 1", onRelationFetched });

    expect(onRelationFetched.mock.calls).toEqual([[IN_DUCKDB_ID], [STORED_ID]]);
    // The stored one was loaded; the one in DuckDB was not reloaded.
    expect(loadParquetMock).toHaveBeenCalledTimes(1);
  });

  it("reports a dataset acquired from its source once its bytes arrive", async () => {
    const onRelationFetched = vi.fn();
    getRelationSourcesMock.mockResolvedValue([
      {
        sourceType: "csv_file",
        dataset: { id: SOURCED_ID, workspaceId: "workspace-1", name: "csv" },
        sourceDataset: { datasetId: SOURCED_ID },
      },
    ]);
    const mediator = _createMediator({ "SELECT 1": [SOURCED_ID] });

    await mediator.runQuery({ rawSql: "SELECT 1", onRelationFetched });

    expect(onRelationFetched.mock.calls).toEqual([[SOURCED_ID]]);
    expect(loadParquetMock).toHaveBeenCalledTimes(1);
  });

  it("reports the datasets a virtual dataset's nested query reads, then the virtual dataset", async () => {
    const onRelationFetched = vi.fn();
    getRelationSourcesMock.mockResolvedValue([
      {
        sourceType: "virtual",
        dataset: { id: VIRTUAL_ID, workspaceId: "workspace-1", name: "v" },
        sourceDataset: { datasetId: VIRTUAL_ID, rawSql: NESTED_SQL },
      },
    ]);
    const mediator = _createMediator({
      "SELECT 1": [VIRTUAL_ID],
      [NESTED_SQL]: [STORED_ID],
    });

    await mediator.runQuery({ rawSql: "SELECT 1", onRelationFetched });

    expect(onRelationFetched.mock.calls).toEqual([[STORED_ID], [VIRTUAL_ID]]);
  });

  it("still answers when the listener throws", async () => {
    const onRelationFetched = vi.fn(() => {
      throw new Error("listener failed");
    });
    runRawQueryMock.mockResolvedValue({ data: [{ answer: 42 }] });
    const mediator = _createMediator({
      "SELECT 1": [IN_DUCKDB_ID, STORED_ID],
    });

    await expect(
      mediator.runQuery({ rawSql: "SELECT 1", onRelationFetched }),
    ).resolves.toEqual({ data: [{ answer: 42 }] });

    expect(onRelationFetched).toHaveBeenCalledTimes(2);
    expect(loadParquetMock).toHaveBeenCalledTimes(1);
  });

  it("reports nothing to an earlier query's listener when a later query has none", async () => {
    const earlierListener = vi.fn();
    const mediator = _createMediator({ "SELECT 1": [STORED_ID] });
    await mediator.runQuery({
      rawSql: "SELECT 1",
      onRelationFetched: earlierListener,
    });
    earlierListener.mockClear();

    await expect(mediator.runQuery({ rawSql: "SELECT 1" })).resolves.toEqual({
      data: [],
    });

    expect(earlierListener).not.toHaveBeenCalled();
  });
});
