/**
 * Tests how the storage relation cache hands cached payloads to the loader,
 * and how the loader applies each relation's precomputed replacements.
 */

import { MIMEType } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryableRelationColumns } from "@/clients/qetl/QueryMediator/QueryableRelationColumns/QueryableRelationColumns";
import { RelationLoading } from "@/clients/qetl/QueryMediator/relationLoading/RelationLoading";
import { createInMemoryRelationCache } from "@/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type {
  QetlRunQuery,
  RelationSource,
} from "@/clients/qetl/QueryMediator/QueryMediator.types";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const PRINCIPAL_KEY = "w:11111111-1111-4111-8111-111111111111:user";

const { getWrapperForRefMock, loadParquetMock } = vi.hoisted(() => {
  return { getWrapperForRefMock: vi.fn(), loadParquetMock: vi.fn() };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: { loadParquet: loadParquetMock } };
});

vi.mock("@/clients/qetl/RelationRegistry/RelationRegistry", () => {
  return { getWrapperForRef: getWrapperForRefMock };
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
    QueryableRelationColumns.clear();
    loadParquetMock.mockResolvedValue({});
  });

  it("loads a relation with only the replacements its columns hold, and records its key", async () => {
    await RelationLoading.loadRelationBytes({
      columnReplacements: {
        replacementsByDatasetId: {
          [DATASET_ID]: [
            { originalName: "zip_code", alias: "zip" },
            { originalName: "not_loaded", dataType: "VARCHAR" },
          ],
        },
        projectionKeyByDatasetId: { [DATASET_ID]: "key-1" },
      },
      datasetDuckDbLease: {} as DatasetDuckDbLease,
      principalKey: PRINCIPAL_KEY,
      relationCache: createInMemoryRelationCache(),
      relations: [
        {
          datasetId: DATASET_ID,
          parquetBlob: new Blob(["parquet"]),
          columns: ["zip_code"],
          staleAt: undefined,
        },
      ],
      relationsToStore: [],
    });

    expect(loadParquetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        columnReplacements: {
          zip_code: { originalName: "zip_code", alias: "zip" },
        },
      }),
    );
    expect(
      QueryableRelationColumns.isProjectionCurrent({
        datasetId: DATASET_ID,
        projectionKey: "key-2",
      }),
    ).toBe(false);
  });

  it("loads a stored session's relation with no replacements and no key", async () => {
    await RelationLoading.loadRelationBytes({
      columnReplacements: undefined,
      datasetDuckDbLease: {} as DatasetDuckDbLease,
      principalKey: PRINCIPAL_KEY,
      relationCache: createInMemoryRelationCache(),
      relations: [
        {
          datasetId: DATASET_ID,
          parquetBlob: new Blob(["parquet"]),
          columns: "all",
          staleAt: undefined,
        },
      ],
      relationsToStore: [],
    });

    expect(loadParquetMock).toHaveBeenCalledWith(
      expect.objectContaining({ columnReplacements: {} }),
    );
  });
});

describe("virtual dataset definitions", () => {
  const VIRTUAL_SQL = 'SELECT * FROM "aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa"';

  it("probes a dataset under the definition it was given", async () => {
    const relationCache = createInMemoryRelationCache();
    const probeSpy = vi.spyOn(relationCache, "probe");

    await RelationLoading.probeStorageRelationCache({
      datasetIds: [DATASET_ID],
      neededByDatasetId: {},
      relationCache,
      principalKey: PRINCIPAL_KEY,
      definitionByDatasetId: {
        [DATASET_ID]: { kind: "virtual_sql", text: VIRTUAL_SQL },
      },
    });

    expect(probeSpy.mock.calls[0]?.[0][0]?.definition).toEqual({
      kind: "virtual_sql",
      text: VIRTUAL_SQL,
    });
  });

  it("stores acquired virtual rows under the SQL they were acquired with", async () => {
    getWrapperForRefMock.mockReturnValue({
      acquire: async () => {
        return {
          ref: { kind: "dataset", id: DATASET_ID },
          parquetBlob: new Blob(["rows"]),
          sourceVersion: undefined,
          maxAgeMs: 60_000,
        };
      },
    });
    const relationSource = {
      sourceType: "virtual",
      dataset: { id: DATASET_ID, workspaceId: "workspace-1", name: "linked" },
      sourceDataset: { datasetId: DATASET_ID, rawSql: VIRTUAL_SQL },
    } as unknown as RelationSource;

    const [fetched] = await RelationLoading.fetchRelationBytes({
      datasetDuckDbLease: {} as DatasetDuckDbLease,
      growFromColumnsByDatasetId: {},
      neededByDatasetId: {},
      relationSources: [relationSource],
      runQuery: vi.fn() as unknown as QetlRunQuery,
    });
    const relationCache = createInMemoryRelationCache();
    const writeSpy = vi.spyOn(relationCache, "write");
    loadParquetMock.mockResolvedValue({});
    await RelationLoading.loadRelationBytes({
      columnReplacements: undefined,
      datasetDuckDbLease: {} as DatasetDuckDbLease,
      principalKey: PRINCIPAL_KEY,
      relationCache,
      relations: [fetched!],
      relationsToStore: [fetched!],
    });

    expect(fetched?.definition).toEqual({
      kind: "virtual_sql",
      text: VIRTUAL_SQL,
    });
    expect(fetched?.staleAt).toBeGreaterThan(Date.now());
    expect(writeSpy.mock.calls[0]?.[0].identity.definition).toEqual({
      kind: "virtual_sql",
      text: VIRTUAL_SQL,
    });
  });
});
