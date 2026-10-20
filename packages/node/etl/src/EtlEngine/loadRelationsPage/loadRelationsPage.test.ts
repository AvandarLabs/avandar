import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resetEtlPathsRootForTesting,
  setEtlPathsRootForTesting,
} from "@etl/EtlEngine/etlPaths";
import { loadRelationsPage } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import { createInMemoryListingsStore } from "@etl/stores/InMemoryListingsStore/createInMemoryListingsStore";
import { createInMemoryObjectStore } from "@etl/stores/InMemoryObjectStore/createInMemoryObjectStore";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  ApiResourceRelation,
  EtlPipelineRunId,
  EtlStores,
  Relation,
} from "@etl/EtlEngine/EtlEngine.types";
import type { LoadRelationsPageContext } from "@etl/EtlEngine/loadRelationsPage/loadRelationsPage";
import type { ListingsStore } from "@etl/stores/EtlStores.types";

const RUN_ID = "00000000-0000-4000-8000-000000000001" as EtlPipelineRunId;

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
    ...overrides,
  };
}

function _apiRelations(count: number): Relation[] {
  return Array.from({ length: count }, (_, index) => {
    return _apiRelation(index);
  });
}

describe("loadRelationsPage", () => {
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
      upsertRows: async (rows) => {
        upsertCalls += 1;
        if (upsertCalls === 2) {
          throw new Error("second chunk failed");
        }
        return listings.upsertRows(rows);
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
    const columnA = {
      name: "a",
      originalDataType: "text",
      castDataType: "VARCHAR",
    } as const;
    const columnB = {
      name: "b",
      originalDataType: "text",
      castDataType: "VARCHAR",
    } as const;
    await loadRelationsPage({
      relations: [_apiRelation(1, { columns: [columnA, columnB] })],
      context: _context(stores),
    });

    await loadRelationsPage({
      relations: [
        _apiRelation(1, { displayName: "Renamed", columns: [columnA] }),
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

  it("does not rewrite an unchanged relation's columns", async () => {
    const listings = createInMemoryListingsStore();
    let replaceCalls = 0;
    const countingListings: ListingsStore = {
      ...listings,
      replaceRelationColumns: async (args) => {
        replaceCalls += 1;
        return listings.replaceRelationColumns(args);
      },
    };
    const relation = _apiRelation(1, {
      columns: [
        { name: "a", originalDataType: "text", castDataType: "VARCHAR" },
      ],
    });
    const stores = { listings: countingListings, objects: undefined };
    await loadRelationsPage({
      relations: [relation],
      context: _context(stores),
    });

    await loadRelationsPage({
      relations: [relation],
      context: _context(stores),
    });

    expect(replaceCalls).toBe(1);
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

    it("uploads the object before writing its row", async () => {
      const events: string[] = [];
      const listings = createInMemoryListingsStore();
      const objects = createInMemoryObjectStore();
      const stores: EtlStores = {
        listings: {
          ...listings,
          upsertRows: async (rows) => {
            events.push("upsert");
            return listings.upsertRows(rows);
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
        relations: [
          {
            kind: "pipeline_parquet",
            externalDatasetId: "WDICSV",
            tableBaseName: "WDICSV",
            csvPath: join(testRoot, "WDICSV.csv"),
            csvColumns: [],
            displayName: "WDI",
            externalOrganizationName: "World Bank",
            sourceUpdatedAt: undefined,
          },
        ],
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
