/**
 * Pins that a view built with an old projection is rebuilt on the next query.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryableRelationColumns } from "@/clients/qetl/QueryMediator/QueryableRelationColumns/QueryableRelationColumns";
import { createInMemoryRelationCache } from "@/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache";
import type { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryMediatorFactory as QueryMediatorFactoryType } from "@/clients/qetl/QueryMediator/QueryMediator";
import type {
  DatasetColumnSource,
  LoadedColumnReplacements,
} from "@/clients/qetl/QueryMediator/QueryMediator.types";

const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const PRINCIPAL_KEY = "w:11111111-1111-4111-8111-111111111111:user";

let relationCache = createInMemoryRelationCache();

const {
  datasetColumnGetAllMock,
  datasetGetAllMock,
  getTableOrViewNamesMock,
  loadColumnReplacementsMock,
  loadParquetMock,
  localDatasetGetAllMock,
  runRawQueryMock,
  sourceDatasetGetAllMock,
} = vi.hoisted(() => {
  return {
    datasetColumnGetAllMock: vi.fn(),
    datasetGetAllMock: vi.fn(),
    getTableOrViewNamesMock: vi.fn(),
    loadColumnReplacementsMock: vi.fn(),
    loadParquetMock: vi.fn(),
    localDatasetGetAllMock: vi.fn(),
    runRawQueryMock: vi.fn(),
    sourceDatasetGetAllMock: vi.fn(),
  };
});

function _cachedClient(getAll: unknown) {
  return {
    withCache: () => {
      return {
        withEnsureQueryData: () => {
          return { getAll };
        },
      };
    },
  };
}

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
      getById: vi.fn(),
      ..._cachedClient(localDatasetGetAllMock),
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: _cachedClient(datasetGetAllMock) };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: _cachedClient(datasetColumnGetAllMock) };
});
vi.mock("@/clients/datasets/source-datasets/CsvFileDatasetClient", () => {
  return { CsvFileDatasetClient: _cachedClient(sourceDatasetGetAllMock) };
});
vi.mock(
  "@/lib/dataDictionaries/loadColumnReplacements/loadColumnReplacements",
  () => {
    return { loadColumnReplacements: loadColumnReplacementsMock };
  },
);

let QueryMediatorFactory: typeof QueryMediatorFactoryType;

beforeAll(async () => {
  ({ QueryMediatorFactory } =
    await import("@/clients/qetl/QueryMediator/QueryMediator"));
});

function _conversionLabelling(label: string): ColumnConversion.T {
  return {
    datasetColumnId: "33333333-3333-4333-8333-333333333333",
    direction: "decode",
    pairs: [{ code: "1", label, acceptedSpellings: [], isMissing: false }],
    isOrdered: false,
    overrides: [],
    keepsOriginalAs: undefined,
    outputDataType: "varchar",
    inputDataType: "bigint",
  };
}

function _catalogLabelling(label: string): LoadedColumnReplacements {
  return {
    replacementsByDatasetId: {
      [DATASET_ID]: [
        { originalName: "GENDER", valueMapping: _conversionLabelling(label) },
      ],
    },
    projectionKeyByDatasetId: { [DATASET_ID]: `labels-${label}` },
  };
}

async function _runQuery(
  datasetColumnSource: DatasetColumnSource,
  dependencies: readonly Dataset.Id[] = [DATASET_ID],
): Promise<void> {
  const mediator = QueryMediatorFactory.create("QueryMediator", {
    state: {
      getQueryDependencies: async () => {
        return [...dependencies];
      },
      getDuckDbLeaseDatasetIds: async () => {
        return [...dependencies];
      },
      relationCache,
      principalKey: PRINCIPAL_KEY,
      datasetColumnSource,
    },
  });
  await mediator.runQuery({ rawSql: "SELECT 1" });
}

beforeEach(async () => {
  vi.clearAllMocks();
  QueryableRelationColumns.clear();
  relationCache = createInMemoryRelationCache();
  await relationCache.write({
    identity: {
      principal: PRINCIPAL_KEY,
      relation: { kind: "dataset", id: DATASET_ID },
      definition: undefined,
      sourceVersion: undefined,
    },
    columns: "all",
    payload: new Blob(["cached"]),
    staleAt: undefined,
  });
  getTableOrViewNamesMock.mockResolvedValue([]);
  datasetGetAllMock.mockResolvedValue([]);
  datasetColumnGetAllMock.mockResolvedValue([]);
  localDatasetGetAllMock.mockResolvedValue([]);
  sourceDatasetGetAllMock.mockResolvedValue([]);
  loadParquetMock.mockResolvedValue({});
  runRawQueryMock.mockResolvedValue({ data: [] });
});

describe("QueryMediator projection key", () => {
  it("rebuilds a loaded view from the storage tier once its code list changes", async () => {
    loadColumnReplacementsMock.mockResolvedValue(_catalogLabelling("Male"));
    await _runQuery("catalog");
    getTableOrViewNamesMock.mockResolvedValue([DATASET_ID]);
    await _runQuery("catalog");
    expect(loadParquetMock).toHaveBeenCalledTimes(1);

    loadColumnReplacementsMock.mockResolvedValue(_catalogLabelling("Man"));
    await _runQuery("catalog");

    expect(loadParquetMock).toHaveBeenCalledTimes(2);
    expect(loadParquetMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        columnReplacements: {
          GENDER: expect.objectContaining({
            valueMapping: _conversionLabelling("Man"),
          }),
        },
      }),
    );
    // Served from the storage tier: nothing was acquired again.
    expect(datasetGetAllMock).not.toHaveBeenCalled();
  });

  it("rebuilds a view loaded while the columns could not be read once they can", async () => {
    // The catalog read failed: no replacements and no keys.
    loadColumnReplacementsMock.mockResolvedValue({
      replacementsByDatasetId: {},
      projectionKeyByDatasetId: {},
    });
    await _runQuery("catalog");
    getTableOrViewNamesMock.mockResolvedValue([DATASET_ID]);
    // Still unreadable: the loaded view keeps being served.
    await _runQuery("catalog");
    expect(loadParquetMock).toHaveBeenCalledTimes(1);

    loadColumnReplacementsMock.mockResolvedValue(_catalogLabelling("Male"));
    await _runQuery("catalog");

    expect(loadParquetMock).toHaveBeenCalledTimes(2);
    expect(loadParquetMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        columnReplacements: {
          GENDER: expect.objectContaining({
            valueMapping: _conversionLabelling("Male"),
          }),
        },
      }),
    );
  });

  it("never reads the catalog in a stored session", async () => {
    await _runQuery("stored");

    expect(loadColumnReplacementsMock).not.toHaveBeenCalled();
    expect(loadParquetMock).toHaveBeenCalledWith(
      expect.objectContaining({ columnReplacements: {} }),
    );
  });

  it("reads no catalog for a query that names no dataset", async () => {
    await _runQuery("catalog", []);

    expect(loadColumnReplacementsMock).not.toHaveBeenCalled();
  });
});
