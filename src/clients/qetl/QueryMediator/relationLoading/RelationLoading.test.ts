/**
 * Tests how the storage relation cache hands cached payloads to the loader,
 * and when the loader reads the dataset column catalog.
 */

import { MIMEType } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RelationLoading } from "@/clients/qetl/QueryMediator/relationLoading/RelationLoading";
import { createInMemoryRelationCache } from "@/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const PRINCIPAL_KEY = "w:11111111-1111-4111-8111-111111111111:user";

const { datasetColumnGetAllMock } = vi.hoisted(() => {
  return { datasetColumnGetAllMock: vi.fn() };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: {} };
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

vi.mock(
  "@/clients/qetl/QueryMediator/relationLoading/createRegistryForFetch",
  () => {
    return { createRegistryForFetch: vi.fn() };
  },
);

describe("RelationLoading.probeStorageRelationCache", () => {
  it("serves a cached payload stored without a type as Parquet", async () => {
    const relationCache = createInMemoryRelationCache();
    await relationCache.write({
      identity: {
        principal: PRINCIPAL_KEY,
        relation: { kind: "dataset", id: DATASET_ID },
        definition: undefined,
        sourceVersion: undefined,
      },
      columns: "all",
      payload: new Blob(["parquet-bytes"]),
      staleAt: undefined,
    });

    const probeResult = await RelationLoading.probeStorageRelationCache({
      datasetIds: [DATASET_ID],
      neededByDatasetId: {},
      relationCache,
      principalKey: PRINCIPAL_KEY,
    });
    const { cachedRelations } = probeResult;

    // `registerParquetFile` refuses an untyped blob, so an entry written
    // before acquisition typed its blobs would otherwise fail every load.
    expect(cachedRelations).toHaveLength(1);
    expect(cachedRelations[0]?.parquetBlob.type).toBe(
      MIMEType.APPLICATION_PARQUET,
    );
    expect(cachedRelations[0]?.parquetBlob.size).toBe("parquet-bytes".length);
  });
});

describe("RelationLoading.loadRelationBytes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    datasetColumnGetAllMock.mockResolvedValue([]);
  });

  it("reads no dataset columns when the query loads no relation", async () => {
    // A query that names no dataset (a literal `VALUES` query, or one whose
    // datasets are all already in DuckDB) loads nothing. The column catalog
    // is gated by RLS, so reading it anyway fails for a visitor who may not
    // read any dataset's columns.
    await RelationLoading.loadRelationBytes({
      datasetColumnSource: "catalog",
      datasetDuckDbLease: {} as DatasetDuckDbLease,
      principalKey: PRINCIPAL_KEY,
      relationCache: createInMemoryRelationCache(),
      relations: [],
      relationsToStore: [],
    });

    expect(datasetColumnGetAllMock).not.toHaveBeenCalled();
  });
});
