/** Pins that both cache tiers are probed ahead of source-type dispatch. */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryRelationCache } from "@/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache";
import type { QueryMediatorFactory as QueryMediatorFactoryType } from "@/clients/qetl/QueryMediator/QueryMediator";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const CACHED_DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const SHEETS_DATASET_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const UNCACHED_DATASET_ID =
  "44444444-4444-4444-8444-444444444444" as Dataset.Id;
const PRINCIPAL_KEY = "w:11111111-1111-4111-8111-111111111111:user";

let relationCache = createInMemoryRelationCache();

async function _seedCache(datasetId: Dataset.Id): Promise<void> {
  await relationCache.write({
    identity: {
      principal: PRINCIPAL_KEY,
      relation: { kind: "dataset", id: datasetId },
      definition: undefined,
      sourceVersion: undefined,
    },
    columns: "all",
    payload: new Blob(["cached"]),
  });
}

const {
  datasetColumnGetAllMock,
  datasetGetAllMock,
  getTableOrViewNamesMock,
  loadParquetMock,
  localDatasetGetAllMock,
  localDatasetGetByIdMock,
  runRawQueryMock,
  sourceDatasetGetAllMock,
} = vi.hoisted(() => {
  return {
    datasetColumnGetAllMock: vi.fn(),
    datasetGetAllMock: vi.fn(),
    getTableOrViewNamesMock: vi.fn(),
    loadParquetMock: vi.fn(),
    localDatasetGetAllMock: vi.fn(),
    localDatasetGetByIdMock: vi.fn(),
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

// Imported once, outside any test's time budget. Importing inside a test puts
// the module graph's transform cost inside the 5s timeout, which passes when
// this file runs alone and times out under a loaded full-suite run. A timeout
// here is worse than a plain failure: the query it abandons stays in flight
// and its later calls land in the next test's spy counts.
let QueryMediatorFactory: typeof QueryMediatorFactoryType;

beforeAll(async () => {
  ({ QueryMediatorFactory } =
    await import("@/clients/qetl/QueryMediator/QueryMediator"));
});

async function _runQueryForDependencies(
  dependencies: readonly Dataset.Id[],
): Promise<void> {
  const mediator = QueryMediatorFactory.create({
    getQueryDependencies: async () => {
      return [...dependencies];
    },
    getDuckDbLeaseDatasetIds: async () => {
      return [...dependencies];
    },
    relationCache,
    principalKey: PRINCIPAL_KEY,
  });
  await mediator.runQuery({ rawSql: "SELECT 1" });
}

beforeEach(() => {
  vi.clearAllMocks();
  relationCache = createInMemoryRelationCache();
  datasetGetAllMock.mockReset();
  sourceDatasetGetAllMock.mockReset();
  // Nothing is in the queryable tier, so every case here exercises the
  // storage tier rather than short-circuiting before it.
  getTableOrViewNamesMock.mockResolvedValue([]);
  datasetGetAllMock.mockResolvedValue([]);
  sourceDatasetGetAllMock.mockResolvedValue([]);
  datasetColumnGetAllMock.mockResolvedValue([]);
  localDatasetGetAllMock.mockResolvedValue([]);
  localDatasetGetByIdMock.mockResolvedValue(undefined);
  loadParquetMock.mockResolvedValue({});
  runRawQueryMock.mockResolvedValue({ data: [] });
});

describe("QueryMediator relation cache ordering", () => {
  it("reads no dataset record when the storage tier serves every relation", async () => {
    await _seedCache(CACHED_DATASET_ID);

    await _runQueryForDependencies([CACHED_DATASET_ID]);

    // Source dispatch is what needs a dataset record, and a fully cached query
    // never reaches it. This is the payoff for probing ahead of dispatch: the
    // common case for a returning user costs no dataset read at all.
    expect(datasetGetAllMock).not.toHaveBeenCalled();
    expect(loadParquetMock).toHaveBeenCalledTimes(1);
  });

  it("still dispatches when the storage tier cannot serve a relation", async () => {
    // Positive control for the assertion above: with nothing cached, the same
    // path does read a dataset record, so `not.toHaveBeenCalled` there is
    // meaningful rather than vacuously true.
    datasetGetAllMock.mockResolvedValue([
      {
        id: UNCACHED_DATASET_ID,
        name: "uncached",
        sourceType: "csv_file",
        workspaceId: "11111111-1111-4111-8111-111111111111",
      },
    ]);
    sourceDatasetGetAllMock.mockResolvedValue([]);

    await _runQueryForDependencies([UNCACHED_DATASET_ID]);

    expect(datasetGetAllMock).toHaveBeenCalledTimes(1);
  });

  it("serves a cached google_sheets relation instead of re-acquiring it", async () => {
    // Probing ahead of dispatch means a Sheet whose bytes are already stored
    // never reaches Drive. Uncached Sheets relations still go through
    // `GoogleSheetsWrapper.acquire`.
    await _seedCache(SHEETS_DATASET_ID);

    await expect(
      _runQueryForDependencies([SHEETS_DATASET_ID]),
    ).resolves.toBeUndefined();

    expect(datasetGetAllMock).not.toHaveBeenCalled();
    expect(loadParquetMock).toHaveBeenCalledTimes(1);
  });

  it("dispatches only the relations the storage tier could not serve", async () => {
    await _seedCache(CACHED_DATASET_ID);
    datasetGetAllMock.mockResolvedValue([]);

    await _runQueryForDependencies([CACHED_DATASET_ID, UNCACHED_DATASET_ID]);

    // One dispatch, and it asks for the uncached id only. The cached one must
    // not appear, or the reordering would be buying nothing on a mixed query.
    expect(datasetGetAllMock).toHaveBeenCalledTimes(1);
    // The tier still holds exactly what it started with. The cached relation
    // was served, not rewritten, and the uncached one resolved to no source so
    // there was nothing to store. A cached relation being written back would
    // show up here as a duplicate write on every query.
    expect(relationCache.storedKeys()).toEqual([
      `${PRINCIPAL_KEY}||${CACHED_DATASET_ID}`,
    ]);
  });
});
