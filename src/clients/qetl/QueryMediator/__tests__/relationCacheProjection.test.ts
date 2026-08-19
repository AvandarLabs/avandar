/** Pins mediator column projection: subset hits, wider misses, growFrom. */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearQueryableRelationColumns,
  rememberQueryableColumns,
} from "@/clients/qetl/QueryMediator/queryableRelationColumns/queryableRelationColumns";
import { createInMemoryRelationCache } from "@/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache";
import type { QueryMediatorFactory as QueryMediatorFactoryType } from "@/clients/qetl/QueryMediator/QueryMediator";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationCacheKey } from "$/models/relations/RelationCacheKey/RelationCacheKey.types";

const DATASET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as Dataset.Id;
const PRINCIPAL_KEY = "w:11111111-1111-4111-8111-111111111111:user";
const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const CONCEPT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

let relationCache = createInMemoryRelationCache();

const {
  acquireMock,
  datasetColumnGetAllMock,
  datasetGetAllMock,
  getTableOrViewNamesMock,
  loadParquetMock,
  localDatasetGetAllMock,
  localDatasetGetByIdMock,
  projectParquetBlobMock,
  runRawQueryMock,
  sourceDatasetGetAllMock,
} = vi.hoisted(() => {
  return {
    acquireMock: vi.fn(),
    datasetColumnGetAllMock: vi.fn(),
    datasetGetAllMock: vi.fn(),
    getTableOrViewNamesMock: vi.fn(),
    loadParquetMock: vi.fn(),
    localDatasetGetAllMock: vi.fn(),
    localDatasetGetByIdMock: vi.fn(),
    projectParquetBlobMock: vi.fn(),
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
      projectParquetBlob: projectParquetBlobMock,
      runRawQuery: runRawQueryMock,
    },
  };
});

vi.mock("@/clients/qetl/wrappers/createDefaultRegistry", () => {
  return {
    createDefaultRegistry: () => {
      return {
        resolve: () => {
          return { acquire: acquireMock, name: "dataset" };
        },
        resolveAll: () => {
          return { resolved: [], unresolved: [] };
        },
        wrappers: () => {
          return [];
        },
      };
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

let QueryMediatorFactory: typeof QueryMediatorFactoryType;

beforeAll(async () => {
  ({ QueryMediatorFactory } =
    await import("@/clients/qetl/QueryMediator/QueryMediator"));
});

function _cacheKey(columns: readonly string[] | "all"): RelationCacheKey {
  return {
    principal: PRINCIPAL_KEY,
    relation: { kind: "dataset", id: DATASET_ID },
    definition: undefined,
    sourceVersion: undefined,
    columns,
  };
}

async function _seedCache(columns: readonly string[] | "all"): Promise<void> {
  await relationCache.write({
    identity: {
      principal: PRINCIPAL_KEY,
      relation: { kind: "dataset", id: DATASET_ID },
      definition: undefined,
      sourceVersion: undefined,
    },
    columns,
    payload: new Blob(["cached"]),
  });
}

async function _heldColumns(): Promise<readonly string[] | "all" | undefined> {
  const { hits, misses } = await relationCache.probe([_cacheKey("all")]);
  return hits[0]?.entry.columns ?? misses[0]?.growFrom?.columns;
}

async function _runSelect(columnNames: readonly string[]): Promise<void> {
  const selectList = columnNames
    .map((columnName) => {
      return `"${columnName}"`;
    })
    .join(", ");
  const mediator = QueryMediatorFactory.create({
    getQueryDependencies: async () => {
      return [DATASET_ID];
    },
    getDuckDbLeaseDatasetIds: async () => {
      return [DATASET_ID];
    },
    relationCache,
    principalKey: PRINCIPAL_KEY,
  });
  await mediator.runQuery({
    rawSql: `SELECT ${selectList} FROM "${DATASET_ID}"`,
  });
}

async function _runCreateTableAs(
  neededColumnsByDatasetId?: Record<string, readonly string[] | "all">,
): Promise<void> {
  const mediator = QueryMediatorFactory.create({
    getQueryDependencies: async () => {
      return [DATASET_ID];
    },
    getDuckDbLeaseDatasetIds: async () => {
      return [DATASET_ID];
    },
    relationCache,
    principalKey: PRINCIPAL_KEY,
  });
  await mediator.runQuery({
    rawSql: `CREATE TABLE "ava_staging_individuals_${CONCEPT_ID}" AS (
      SELECT DISTINCT "a" AS external_id FROM "${DATASET_ID}"
    )`,
    neededColumnsByDatasetId,
  });
}

function _mockAcquirableCsvSource(): void {
  datasetGetAllMock.mockResolvedValue([
    {
      id: DATASET_ID,
      name: "projected",
      sourceType: "csv_file",
      workspaceId: WORKSPACE_ID,
    },
  ]);
  sourceDatasetGetAllMock.mockResolvedValue([
    { datasetId: DATASET_ID, delimiter: "," },
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  relationCache = createInMemoryRelationCache();
  clearQueryableRelationColumns();
  getTableOrViewNamesMock.mockResolvedValue([]);
  datasetGetAllMock.mockResolvedValue([]);
  sourceDatasetGetAllMock.mockResolvedValue([]);
  datasetColumnGetAllMock.mockResolvedValue([]);
  localDatasetGetAllMock.mockResolvedValue([]);
  localDatasetGetByIdMock.mockResolvedValue(undefined);
  loadParquetMock.mockResolvedValue({});
  runRawQueryMock.mockResolvedValue({ data: [] });
  acquireMock.mockResolvedValue({
    ref: { kind: "dataset", id: DATASET_ID },
    parquetBlob: new Blob(["acquired"]),
    sourceVersion: undefined,
  });
  projectParquetBlobMock.mockImplementation(
    async ({ parquetBlob }: { parquetBlob: Blob }) => {
      return parquetBlob;
    },
  );
});

describe("QueryMediator relation cache projection", () => {
  it("serves a subset from an 'all' cache without reading a dataset record", async () => {
    await _seedCache("all");

    await _runSelect(["a"]);

    expect(datasetGetAllMock).not.toHaveBeenCalled();
    expect(loadParquetMock).toHaveBeenCalledTimes(1);
  });

  it("still dispatches when storage cannot serve the same subset query", async () => {
    await _runSelect(["a"]);

    expect(datasetGetAllMock).toHaveBeenCalledTimes(1);
  });

  it("does not serve a wider query from a finite cache, then stores the union", async () => {
    await _seedCache(["a"]);
    _mockAcquirableCsvSource();

    await _runSelect(["b"]);

    expect(datasetGetAllMock).toHaveBeenCalledTimes(1);
    expect(acquireMock).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: ["a", "b"],
        ref: { kind: "dataset", id: DATASET_ID },
      }),
      expect.anything(),
    );
    expect(projectParquetBlobMock).toHaveBeenCalledWith(
      expect.objectContaining({ columns: ["a", "b"] }),
    );
    expect(await _heldColumns()).toEqual(["a", "b"]);
    expect(relationCache.storedKeys()).toEqual([
      `${PRINCIPAL_KEY}||${DATASET_ID}`,
    ]);
  });

  it("does not skip storage when a queryable table is too narrow", async () => {
    getTableOrViewNamesMock.mockResolvedValue([DATASET_ID]);
    rememberQueryableColumns(DATASET_ID, ["a"]);

    await _runSelect(["a", "b"]);

    expect(datasetGetAllMock).toHaveBeenCalledTimes(1);
  });

  it("serves a covering queryable table without reading a dataset record", async () => {
    getTableOrViewNamesMock.mockResolvedValue([DATASET_ID]);
    rememberQueryableColumns(DATASET_ID, ["a"]);

    await _runSelect(["a"]);

    expect(datasetGetAllMock).not.toHaveBeenCalled();
  });
  // A `CREATE TABLE AS SELECT` has no top-level select list, so inference
  // cannot read one and fails wide. Individual generation is exactly that
  // shape, which is why it acquired every column of every dataset it named.
  it("acquires 'all' for a CREATE TABLE AS SELECT with no stated columns", async () => {
    _mockAcquirableCsvSource();

    await _runCreateTableAs();

    expect(acquireMock).toHaveBeenCalledWith(
      expect.objectContaining({ columns: "all" }),
      expect.anything(),
    );
    expect(projectParquetBlobMock).not.toHaveBeenCalled();
  });

  it("acquires only the columns a CREATE TABLE AS SELECT states it needs", async () => {
    _mockAcquirableCsvSource();

    await _runCreateTableAs({ [DATASET_ID]: ["a"] });

    expect(acquireMock).toHaveBeenCalledWith(
      expect.objectContaining({ columns: ["a"] }),
      expect.anything(),
    );
    expect(projectParquetBlobMock).toHaveBeenCalledWith(
      expect.objectContaining({ columns: ["a"] }),
    );
    expect(await _heldColumns()).toEqual(["a"]);
  });
});
