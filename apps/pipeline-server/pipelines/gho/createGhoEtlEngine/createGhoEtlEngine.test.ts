import {
  createInMemoryDrivesStore,
  createInMemoryListingsStore,
  loadCatalogFieldMapper,
} from "@avandar/etl";
import {
  createFakeGhoApi,
  FAKE_GHO_BASE_URL,
} from "@pipelines/gho/__tests__/ghoFakeApi.fixtures";
import { createGhoEtlEngine } from "@pipelines/gho/createGhoEtlEngine/createGhoEtlEngine";
import { describe, expect, it } from "vitest";
import type { EtlClock, EtlStores } from "@avandar/etl";
import type {
  FakeGhoDimension,
  FakeGhoIndicator,
} from "@pipelines/gho/__tests__/ghoFakeApi.fixtures";

const OUTPUT = {
  listingsTable: "data_catalog_listings",
  upsertListingsFunction:
    "rpc_data_catalog_listings__upsert_with_relation_columns",
};
const CHECKED_AT = new Date("2026-11-09T06:00:00.000Z");
const CLOCK: EtlClock = {
  now: () => {
    return CHECKED_AT;
  },
  monotonicMs: () => {
    return 0;
  },
};

const MEASLES: FakeGhoIndicator = {
  code: "WHS3_62",
  name: "Measles - number of reported cases",
  rows: [{ Date: "2024-01-05T10:00:00+01:00", SpatialDimType: "COUNTRY" }],
};
const EMPTY_INDICATOR: FakeGhoIndicator = { code: "EMPTY_1", name: "Empty" };
const COUNTRY: FakeGhoDimension = {
  code: "COUNTRY",
  title: "Country",
  values: [{ Code: "SDN", Title: "Sudan", Dimension: "COUNTRY" }],
};

async function _engine(
  stores: EtlStores,
  api: ReturnType<typeof createFakeGhoApi>,
) {
  return createGhoEtlEngine({
    output: OUTPUT,
    http: api.http,
    drives: [
      { baseUrl: FAKE_GHO_BASE_URL, organizationLabels: { 1: "Organization" } },
    ],
    mapper: await loadCatalogFieldMapper({
      config: {
        fields: {
          organization1_name: { value: "World Health Organization" },
          organization2_name: { value: "Global Health Observatory" },
        },
        drives: [{ baseUrl: FAKE_GHO_BASE_URL }],
      },
      configDir: "/",
    }),
    stores,
    clock: CLOCK,
    workspaceLoadability: { unloadableFormats: [] },
  });
}

describe("createGhoEtlEngine", () => {
  it("writes one odata listing per indicator and per dimension", async () => {
    const listings = createInMemoryListingsStore();
    const api = createFakeGhoApi({
      indicators: [MEASLES, EMPTY_INDICATOR],
      dimensions: [COUNTRY],
    });

    await (
      await _engine({ listings, objects: undefined }, api)
    ).run({
      mode: "full",
    });

    expect(
      listings.getRows().map((row) => {
        return [
          row.pipeline_name,
          row.api_service,
          row.api_base_url,
          row.external_dataset_id,
          row.api_resource_id,
          row.api_resource_format,
          row.is_workspace_loadable,
          row.organization2_name,
          row.pipeline_scope_keys,
        ];
      }),
    ).toEqual([
      [
        "gho",
        "odata",
        FAKE_GHO_BASE_URL,
        "WHS3_62",
        "WHS3_62",
        "ODATA",
        true,
        "Global Health Observatory",
        ["indicators"],
      ],
      [
        "gho",
        "odata",
        FAKE_GHO_BASE_URL,
        "EMPTY_1",
        "EMPTY_1",
        "ODATA",
        false,
        "Global Health Observatory",
        ["indicators"],
      ],
      [
        "gho",
        "odata",
        FAKE_GHO_BASE_URL,
        "DIMENSION/COUNTRY",
        "DIMENSION/COUNTRY/DimensionValues",
        "ODATA",
        true,
        "Global Health Observatory",
        ["dimensions"],
      ],
    ]);
  });

  it("writes an indicator's verified columns, companions, and freshness probe", async () => {
    const listings = createInMemoryListingsStore();
    const api = createFakeGhoApi({ indicators: [MEASLES] });

    await (
      await _engine({ listings, objects: undefined }, api)
    ).run({
      mode: "full",
    });

    const [row] = listings.getRows();
    expect([
      row?.date_column_type_last_verified,
      listings.getRelationColumns(row?.id ?? "")?.length,
      row?.companion_listings.map((companion) => {
        return companion.apiResourceId;
      }),
      row?.api_freshness_probe?.token.kind,
    ]).toEqual([
      CHECKED_AT.toISOString(),
      25,
      ["DIMENSION/COUNTRY/DimensionValues"],
      "json-paths",
    ]);
  });

  it("writes nothing on a second run over an unchanged GHO", async () => {
    const listings = createInMemoryListingsStore();
    const api = createFakeGhoApi({
      indicators: [MEASLES, EMPTY_INDICATOR],
      dimensions: [COUNTRY],
    });
    const stores = { listings, objects: undefined };
    await (await _engine(stores, api)).run({ mode: "full" });

    const report = await (await _engine(stores, api)).run({ mode: "full" });

    expect(
      report.crawls.map((crawl) => {
        return [
          crawl.scopeKey,
          crawl.relationsWritten,
          crawl.relationsUnchanged,
        ];
      }),
    ).toEqual([
      ["indicators", 0, 2],
      ["dimensions", 0, 1],
    ]);
  });

  it("records the drive's organization labels", async () => {
    const drives = createInMemoryDrivesStore();
    const api = createFakeGhoApi({ indicators: [MEASLES] });

    await (
      await _engine(
        { listings: createInMemoryListingsStore(), objects: undefined, drives },
        api,
      )
    ).run({ mode: "full" });

    expect(drives.getDrives()[0]?.organizationLabels).toEqual({
      1: "Organization",
    });
  });

  it("refuses an incremental run, since GHO lists no modified times", async () => {
    const api = createFakeGhoApi({ indicators: [MEASLES] });
    const engine = await _engine(
      { listings: createInMemoryListingsStore(), objects: undefined },
      api,
    );

    await expect(engine.run({ mode: "incremental" })).rejects.toThrow(
      "The gho pipeline does not support incremental runs.",
    );
  });

  it("fails the run, writing nothing, when $metadata cannot be read", async () => {
    const listings = createInMemoryListingsStore();
    const api = createFakeGhoApi({
      indicators: [MEASLES],
      dimensions: [COUNTRY],
      metadataStatus: 500,
    });

    await expect(
      (await _engine({ listings, objects: undefined }, api)).run({
        mode: "full",
      }),
    ).rejects.toThrow(/\$metadata/);
    expect(listings.getRows()).toEqual([]);
  });
});
