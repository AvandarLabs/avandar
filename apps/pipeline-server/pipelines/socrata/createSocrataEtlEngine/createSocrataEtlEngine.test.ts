import {
  createInMemoryCheckpointStore,
  createInMemoryListingsStore,
} from "@avandar/etl";
import { createSocrataEtlEngine } from "@pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine";
import { describe, expect, it, vi } from "vitest";
import type { EtlStores } from "@avandar/etl";
import type {
  SocrataDiscoveryClient,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";

const DRIVE = {
  baseUrl: "https://data.cityofnewyork.us",
  organizationName: "City of New York",
};
const OUTPUT = {
  listingsTable: "data_catalog_listings",
  relationColumnsTable: "data_catalog_listings__relation_columns",
};

function _catalog(size: number): SocrataDiscoveryResult[] {
  return Array.from({ length: size }, (_, index) => {
    return {
      datasetId: `ds-${index}`,
      name: `Dataset ${index}`,
      domain: "data.cityofnewyork.us",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    };
  });
}

function _discoveryOver(
  catalog: readonly SocrataDiscoveryResult[],
): SocrataDiscoveryClient {
  return {
    search: vi.fn(async ({ limit = 100, offset = 0 }) => {
      return {
        results: catalog.slice(offset, offset + limit),
        skippedResults: [],
        resultSetSize: catalog.length,
      };
    }),
  };
}

function _engine(
  stores: EtlStores,
  catalog: readonly SocrataDiscoveryResult[],
) {
  return createSocrataEtlEngine({
    output: OUTPUT,
    discovery: _discoveryOver(catalog),
    drives: [DRIVE],
    stores,
  });
}

describe("createSocrataEtlEngine", () => {
  it("writes one listing per dataset, dated by its updatedAt", async () => {
    const listings = createInMemoryListingsStore();
    const stores = {
      listings,
      objects: undefined,
      checkpoints: createInMemoryCheckpointStore(),
    };

    await _engine(stores, _catalog(3)).run({ mode: "full" });

    expect(
      listings.getRows().map((row) => {
        return [row.pipeline_name, row.api_base_url, row.date_of_last_update];
      }),
    ).toEqual([
      ["socrata", DRIVE.baseUrl, "2026-10-01T00:00:00.000Z"],
      ["socrata", DRIVE.baseUrl, "2026-10-01T00:01:00.000Z"],
      ["socrata", DRIVE.baseUrl, "2026-10-01T00:02:00.000Z"],
    ]);
  });

  it("writes each dataset once across overlapping pages", async () => {
    const listings = createInMemoryListingsStore();
    const stores = {
      listings,
      objects: undefined,
      checkpoints: createInMemoryCheckpointStore(),
    };

    await _engine(stores, _catalog(1500)).run({ mode: "full" });

    const upserted = listings.getUpsertBatches().reduce((sum, batch) => {
      return sum + batch.length;
    }, 0);
    expect([listings.getRows().length, upserted]).toEqual([1500, 1500]);
  });

  it("continues an incremental run from its checkpoint", async () => {
    const listings = createInMemoryListingsStore();
    const stores = {
      listings,
      objects: undefined,
      checkpoints: createInMemoryCheckpointStore(),
    };
    await _engine(stores, _catalog(5)).run({ mode: "full", limit: 2 });

    const report = await _engine(stores, _catalog(5)).run({
      mode: "incremental",
    });

    expect([
      report.crawls[0]?.relationsWritten,
      listings.getRows().length,
    ]).toEqual([3, 5]);
  });
});
