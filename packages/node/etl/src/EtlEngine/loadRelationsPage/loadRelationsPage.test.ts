import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createCrawlMetricsRecorder,
  SYSTEM_CLOCK,
} from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import {
  resetEtlPathsRootForTesting,
  setEtlPathsRootForTesting,
} from "@etl/EtlEngine/etlPaths";
import {
  COLUMNS_PER_WRITE,
  loadRelationsPage,
} from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import { createInMemoryListingsStore } from "@etl/stores/InMemoryListingsStore/createInMemoryListingsStore";
import { createInMemoryObjectStore } from "@etl/stores/InMemoryObjectStore/createInMemoryObjectStore";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  ApiResourceRelation,
  EtlClock,
  EtlPipelineRunId,
  EtlStores,
  PipelineParquetRelation,
  Relation,
  RelationColumn,
} from "@etl/EtlEngine/EtlEngine.types";
import type { LoadRelationsPageContext } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import type { ListingsStore } from "@etl/stores/EtlStores.types";

const RUN_ID = "00000000-0000-4000-8000-000000000001" as EtlPipelineRunId;
const COLUMN_A: RelationColumn = {
  name: "a",
  originalDataType: "text",
  castDataType: "VARCHAR",
};
const COLUMN_B: RelationColumn = {
  name: "b",
  originalDataType: "text",
  castDataType: "VARCHAR",
};

function _context(
  stores: EtlStores,
  overrides: Partial<LoadRelationsPageContext> = {},
): LoadRelationsPageContext {
  return {
    pipelineName: "socrata",
    pipelineRunId: RUN_ID,
    service: "socrata",
    driveKey: "https://data.cityofnewyork.us",
    syncedAt: new Date("2026-10-20T12:00:00.000Z"),
    stores,
    bucket: undefined,
    scopeKey: "all",
    metrics: createCrawlMetricsRecorder(SYSTEM_CLOCK),
    ...overrides,
  };
}

function _apiRelation(
  index: number,
  overrides: Partial<ApiResourceRelation> = {},
): ApiResourceRelation {
  const id = `ds-${String(index).padStart(3, "0")}`;
  return {
    kind: "api_resource",
    externalDatasetId: id,
    apiResourceId: id,
    apiResourceFormat: "CSV",
    displayName: `Dataset ${index}`,
    externalOrganizationName: "City of New York",
    sourceUpdatedAt: new Date(Date.UTC(2026, 9, 1, 0, index)),
    columns: [COLUMN_A],
    ...overrides,
  };
}

function _parquetRelation(csvPath: string): PipelineParquetRelation {
  return {
    kind: "pipeline_parquet",
    externalDatasetId: "WDICSV",
    tableBaseName: "WDICSV",
    csvPath,
    csvColumns: [],
    displayName: "WDI",
    externalOrganizationName: "World Bank",
    sourceUpdatedAt: undefined,
  };
}

function _columns(count: number): RelationColumn[] {
  return Array.from({ length: count }, (_, index) => {
    return { ...COLUMN_A, name: `column_${index}` };
  });
}

function _apiRelations(count: number): Relation[] {
  return Array.from({ length: count }, (_, index) => {
    return _apiRelation(index);
  });
}

describe("loadRelationsPage", () => {
  it("counts the listings and columns it considered and wrote, the widest listing, and source sizes", async () => {
    const listings = createInMemoryListingsStore();
    const metrics = createCrawlMetricsRecorder(SYSTEM_CLOCK);
    const stores = { listings, objects: undefined };
    await loadRelationsPage({
      relations: [_apiRelation(1, { columns: [COLUMN_A] })],
      context: _context(stores),
    });

    await loadRelationsPage({
      relations: [
        _apiRelation(1, { columns: [COLUMN_A] }),
        _apiRelation(2, {
          columns: [COLUMN_A, COLUMN_B],
          sourceSizeBytes: 300,
        }),
      ],
      context: _context(stores, { metrics }),
    });

    expect(
      metrics.snapshot({
        connectionsFetched: 0,
        relationsWritten: 0,
        relationsUnchanged: 0,
      }).denominators,
    ).toMatchObject({
      listingsConsidered: 2,
      columnsConsidered: 3,
      columnsWritten: 2,
      maxColumnsPerListing: 2,
      writeBatches: 1,
      sourceBytesReported: 300,
    });
  });

  it("times reading stored rows and each write batch", async () => {
    let elapsedMs = 0;
    const tickingClock: EtlClock = {
      now: () => {
        return new Date(elapsedMs);
      },
      monotonicMs: () => {
        elapsedMs += 1;
        return elapsedMs;
      },
    };
    const metrics = createCrawlMetricsRecorder(tickingClock);

    await loadRelationsPage({
      relations: [_apiRelation(1)],
      context: _context(
        { listings: createInMemoryListingsStore(), objects: undefined },
        { metrics },
      ),
    });

    const { timings } = metrics.snapshot({
      connectionsFetched: 0,
      relationsWritten: 0,
      relationsUnchanged: 0,
    });
    expect([timings.loadReadMs > 0, timings.loadWriteMs > 0]).toEqual([
      true,
      true,
    ]);
  });

  it("writes nothing when the same page is loaded again", async () => {
    const listings = createInMemoryListingsStore();
    const stores = { listings, objects: undefined };
    await loadRelationsPage({
      relations: _apiRelations(3),
      context: _context(stores),
    });

    const result = await loadRelationsPage({
      relations: _apiRelations(3),
      context: _context(stores),
    });

    expect([result, listings.getUpsertBatches().length]).toEqual([
      { written: 0, unchanged: 3 },
      1,
    ]);
  });

  it("rewrites a relation whose mapping changed", async () => {
    const stores = {
      listings: createInMemoryListingsStore(),
      objects: undefined,
    };
    await loadRelationsPage({
      relations: [_apiRelation(1)],
      context: _context(stores),
    });

    const result = await loadRelationsPage({
      relations: [_apiRelation(1, { displayName: "Renamed" })],
      context: _context(stores),
    });

    expect(result).toEqual({ written: 1, unchanged: 0 });
  });

  it("counts a row as unchanged when only the run and sync time differ", async () => {
    const stores = {
      listings: createInMemoryListingsStore(),
      objects: undefined,
    };
    await loadRelationsPage({
      relations: [_apiRelation(1)],
      context: _context(stores),
    });

    const result = await loadRelationsPage({
      relations: [_apiRelation(1)],
      context: _context(stores, {
        pipelineRunId:
          "00000000-0000-4000-8000-000000000002" as EtlPipelineRunId,
        syncedAt: new Date("2026-10-21T12:00:00.000Z"),
      }),
    });

    expect(result).toEqual({ written: 0, unchanged: 1 });
  });

  it("records the page's scope on a new row", async () => {
    const listings = createInMemoryListingsStore();

    await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context({ listings, objects: undefined }, { scopeKey: "x" }),
    });

    expect(
      listings.getRows().map((row) => {
        return row.pipeline_scope_keys;
      }),
    ).toEqual([["x"]]);
  });

  it("adds a second scope's key to a row another scope wrote, once", async () => {
    const listings = createInMemoryListingsStore();
    const stores = { listings, objects: undefined };
    await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "x" }),
    });

    const second = await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "y" }),
    });
    const third = await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "y" }),
    });

    expect([second, third, listings.getRows()[0]?.pipeline_scope_keys]).toEqual(
      [{ written: 1, unchanged: 0 }, { written: 0, unchanged: 1 }, ["x", "y"]],
    );
  });

  it("keeps the stored order of a row's scope keys", async () => {
    const listings = createInMemoryListingsStore();
    const stores = { listings, objects: undefined };
    await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "y" }),
    });
    await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "x" }),
    });

    const result = await loadRelationsPage({
      relations: _apiRelations(1),
      context: _context(stores, { scopeKey: "y" }),
    });

    expect([result, listings.getRows()[0]?.pipeline_scope_keys]).toEqual([
      { written: 0, unchanged: 1 },
      ["y", "x"],
    ]);
  });

  it("reads 450 relations back in chunks of at most 200", async () => {
    const listings = createInMemoryListingsStore();

    await loadRelationsPage({
      relations: _apiRelations(450),
      context: _context({ listings, objects: undefined }),
    });

    expect(listings.getReadBatchSizes()).toEqual([200, 200, 50]);
  });

  it("keeps earlier chunks written when a later chunk fails", async () => {
    const listings = createInMemoryListingsStore();
    let upsertCalls = 0;
    const failingListings: ListingsStore = {
      ...listings,
      upsertListingsWithColumns: async (entries) => {
        upsertCalls += 1;
        if (upsertCalls === 2) {
          throw new Error("second chunk failed");
        }
        return listings.upsertListingsWithColumns(entries);
      },
    };

    await expect(
      loadRelationsPage({
        relations: _apiRelations(450),
        context: _context({ listings: failingListings, objects: undefined }),
      }),
    ).rejects.toThrow("second chunk failed");
    expect(
      listings.getRows().map((row) => {
        return row.external_dataset_id;
      }),
    ).toEqual(
      _apiRelations(200).map((relation) => {
        return relation.externalDatasetId;
      }),
    );
  });

  it("replaces a written relation's whole column set", async () => {
    const listings = createInMemoryListingsStore();
    const stores = { listings, objects: undefined };
    await loadRelationsPage({
      relations: [_apiRelation(1, { columns: [COLUMN_A, COLUMN_B] })],
      context: _context(stores),
    });

    await loadRelationsPage({
      relations: [
        _apiRelation(1, { displayName: "Renamed", columns: [COLUMN_A] }),
      ],
      context: _context(stores),
    });

    const listingId = listings.getRows()[0]?.id ?? "";
    expect(
      listings.getRelationColumns(listingId)?.map((column) => {
        return column.column_name;
      }),
    ).toEqual(["a"]);
  });

  it("writes every row in the same call as its columns", async () => {
    const listings = createInMemoryListingsStore();

    await loadRelationsPage({
      relations: [
        _apiRelation(1, { columns: [COLUMN_A, COLUMN_B] }),
        _apiRelation(2, { columns: [COLUMN_B] }),
      ],
      context: _context({ listings, objects: undefined }),
    });

    expect(
      listings.getUpsertBatches().map((batch) => {
        return batch.map(({ row, columns }) => {
          return [
            row.external_dataset_id,
            columns.map((column) => {
              return column.column_name;
            }),
          ];
        });
      }),
    ).toEqual([
      [
        ["ds-001", ["a", "b"]],
        ["ds-002", ["b"]],
      ],
    ]);
  });

  it("starts a new write when the next relation's columns would pass the cap, never splitting one", async () => {
    const listings = createInMemoryListingsStore();
    const halfOfCap = COLUMNS_PER_WRITE / 2;

    await loadRelationsPage({
      relations: [
        _apiRelation(1, { columns: _columns(halfOfCap) }),
        _apiRelation(2, { columns: _columns(halfOfCap) }),
        _apiRelation(3, { columns: _columns(1) }),
        _apiRelation(4, { columns: _columns(COLUMNS_PER_WRITE + 1) }),
        _apiRelation(5, { columns: _columns(1) }),
      ],
      context: _context({ listings, objects: undefined }),
    });

    expect(
      listings.getUpsertBatches().map((batch) => {
        return batch.map(({ row, columns }) => {
          return [row.external_dataset_id, columns.length];
        });
      }),
    ).toEqual([
      [
        ["ds-001", halfOfCap],
        ["ds-002", halfOfCap],
      ],
      [["ds-003", 1]],
      [["ds-004", COLUMNS_PER_WRITE + 1]],
      [["ds-005", 1]],
    ]);
  });

  it("writes an API relation with no columns, with an empty column set", async () => {
    const listings = createInMemoryListingsStore();

    await loadRelationsPage({
      relations: [_apiRelation(1, { columns: [] })],
      context: _context({ listings, objects: undefined }),
    });

    const [row] = listings.getRows();
    expect([
      row?.external_dataset_id,
      listings.getRelationColumns(row?.id ?? ""),
    ]).toEqual(["ds-001", []]);
  });

  it("writes nothing when a relation with columns is loaded again", async () => {
    const listings = createInMemoryListingsStore();
    const stores = { listings, objects: undefined };
    const relation = _apiRelation(1, { columns: [COLUMN_A] });
    await loadRelationsPage({
      relations: [relation],
      context: _context(stores),
    });
    const upsertCallsBefore = listings.getUpsertBatches().length;

    const result = await loadRelationsPage({
      relations: [relation],
      context: _context(stores),
    });

    expect([result, listings.getUpsertBatches().length]).toEqual([
      { written: 0, unchanged: 1 },
      upsertCallsBefore,
    ]);
  });

  it("stores a fingerprint of the relation's columns in its metadata", async () => {
    const listings = createInMemoryListingsStore();

    await loadRelationsPage({
      relations: [_apiRelation(1, { columns: [COLUMN_A] })],
      context: _context({ listings, objects: undefined }),
    });

    expect(listings.getRows()[0]?.metadata).toEqual({
      relation_columns_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("rewrites a relation whose only change is its columns", async () => {
    const listings = createInMemoryListingsStore();
    const stores = { listings, objects: undefined };
    await loadRelationsPage({
      relations: [_apiRelation(1, { columns: [COLUMN_A, COLUMN_B] })],
      context: _context(stores),
    });

    const result = await loadRelationsPage({
      relations: [_apiRelation(1, { columns: [COLUMN_A] })],
      context: _context(stores),
    });

    expect(result).toEqual({ written: 1, unchanged: 0 });
  });

  it("rejects a page that repeats a listing key before reading or writing", async () => {
    const listings = createInMemoryListingsStore();

    await expect(
      loadRelationsPage({
        relations: [
          _apiRelation(1),
          _apiRelation(1, { displayName: "Dataset 1 again" }),
        ],
        context: _context({ listings, objects: undefined }),
      }),
    ).rejects.toThrow(
      'Relations "Dataset 1" (external dataset id "ds-001") and "Dataset 1 again" (external dataset id "ds-001") share the listing key ["api_resource","socrata","https://data.cityofnewyork.us","ds-001","ds-001"]',
    );
    expect([listings.getReadBatchSizes(), listings.getUpsertBatches()]).toEqual(
      [[], []],
    );
  });

  describe("with a Parquet relation", () => {
    let testRoot: string;

    beforeEach(async () => {
      testRoot = await mkdtemp(join(tmpdir(), "etl-load-page-"));
      setEtlPathsRootForTesting(testRoot);
      await writeFile(join(testRoot, "WDICSV.csv"), "a,b\n1,x\n");
    });

    afterEach(async () => {
      resetEtlPathsRootForTesting();
      await rm(testRoot, { force: true, recursive: true });
    });

    it("writes both listing kinds in one call, in page order", async () => {
      const listings = createInMemoryListingsStore();

      await loadRelationsPage({
        relations: [
          _apiRelation(1),
          _parquetRelation(join(testRoot, "WDICSV.csv")),
          _apiRelation(2),
        ],
        context: _context(
          { listings, objects: createInMemoryObjectStore() },
          { bucket: "opendata" },
        ),
      });

      expect(
        listings.getUpsertBatches().map((batch) => {
          return batch.map(({ row }) => {
            return row.external_dataset_id;
          });
        }),
      ).toEqual([["ds-001", "WDICSV", "ds-002"]]);
    });

    it("uploads the object before writing its row", async () => {
      const events: string[] = [];
      const listings = createInMemoryListingsStore();
      const objects = createInMemoryObjectStore();
      const stores: EtlStores = {
        listings: {
          ...listings,
          upsertListingsWithColumns: async (entries) => {
            events.push("upsert");
            return listings.upsertListingsWithColumns(entries);
          },
        },
        objects: {
          ...objects,
          upload: async (args) => {
            events.push("upload");
            return objects.upload(args);
          },
        },
      };

      await loadRelationsPage({
        relations: [_parquetRelation(join(testRoot, "WDICSV.csv"))],
        context: _context(stores, {
          pipelineName: "world-bank__wdi",
          service: undefined,
          driveKey: "world-bank__wdi",
          bucket: "opendata",
        }),
      });

      expect(events).toEqual(["upload", "upsert"]);
    });
  });
});
