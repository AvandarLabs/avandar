/** Pins that a query reports each dataset it loads once, wherever from. */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryableRelationColumns } from "@/clients/qetl/QueryMediator/QueryableRelationColumns/QueryableRelationColumns";
import { createInMemoryRelationCache } from "@/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryMediatorFactory as QueryMediatorFactoryType } from "@/clients/qetl/QueryMediator/QueryMediator";

const IN_DUCKDB_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const STORED_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const PRINCIPAL_KEY = "w:11111111-1111-4111-8111-111111111111:user";

let relationCache = createInMemoryRelationCache();

const {
  datasetColumnGetAllMock,
  datasetGetAllMock,
  getTableOrViewNamesMock,
  loadParquetMock,
  runRawQueryMock,
} = vi.hoisted(() => {
  return {
    datasetColumnGetAllMock: vi.fn(),
    datasetGetAllMock: vi.fn(),
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
  runRawQueryMock.mockResolvedValue({ data: [] });
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

describe("QueryMediator relation progress", () => {
  it("reports a dataset DuckDB serves and one the storage tier serves, once each", async () => {
    const onRelationFetched = vi.fn();
    const mediator = QueryMediatorFactory.create("QueryMediator", {
      state: {
        getQueryDependencies: async () => {
          return [IN_DUCKDB_ID, STORED_ID];
        },
        getDuckDbLeaseDatasetIds: async () => {
          return [IN_DUCKDB_ID, STORED_ID];
        },
        relationCache,
        principalKey: PRINCIPAL_KEY,
      },
    });

    await mediator.runQuery({ rawSql: "SELECT 1", onRelationFetched });

    expect(onRelationFetched.mock.calls).toEqual([[IN_DUCKDB_ID], [STORED_ID]]);
    // The stored one was loaded; the one in DuckDB was not reloaded.
    expect(loadParquetMock).toHaveBeenCalledTimes(1);
  });

  it("runs as before with no callback", async () => {
    const mediator = QueryMediatorFactory.create("QueryMediator", {
      state: {
        getQueryDependencies: async () => {
          return [STORED_ID];
        },
        getDuckDbLeaseDatasetIds: async () => {
          return [STORED_ID];
        },
        relationCache,
        principalKey: PRINCIPAL_KEY,
      },
    });

    await expect(mediator.runQuery({ rawSql: "SELECT 1" })).resolves.toEqual({
      data: [],
    });
  });
});
