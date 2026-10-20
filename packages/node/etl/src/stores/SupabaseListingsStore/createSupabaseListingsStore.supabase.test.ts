import { randomUUID } from "node:crypto";
import { isListingRowUnchanged } from "@etl/EtlEngine/isListingRowUnchanged/isListingRowUnchanged";
import { createSupabaseListingsStore } from "@etl/stores/SupabaseListingsStore/createSupabaseListingsStore";
import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
import type { ListingRowValues } from "@etl/stores/EtlStores.types";

const LISTINGS_TABLE = "data_catalog_listings";
const COLUMNS_TABLE = "data_catalog_listings__relation_columns";
const DRIVE = "https://etl-fixture.invalid";
const OTHER_DRIVE = "https://etl-fixture-other.invalid";
const PIPELINE_NAME = `etl-fixture-${randomUUID()}`;
const OTHER_PIPELINE_NAME = `etl-fixture-${randomUUID()}`;

const client = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } },
);
const store = createSupabaseListingsStore({
  client,
  listingsTable: LISTINGS_TABLE,
  relationColumnsTable: COLUMNS_TABLE,
});

function _apiRow(overrides: Partial<ListingRowValues> = {}): ListingRowValues {
  return {
    access_kind: "api_resource",
    pipeline_name: PIPELINE_NAME,
    pipeline_run_id: "run-1",
    display_name: "Fixture dataset",
    external_organization_name: "Fixture Org",
    external_dataset_id: "etl-fixture-dataset",
    date_of_last_update: "2026-10-01T00:00:00.000Z",
    date_of_last_sync: "2026-10-20T00:00:00.000Z",
    external_service_name: null,
    source_url: null,
    canonical_urls: ["https://etl-fixture.invalid/d/1"],
    license: null,
    update_frequency: null,
    description: null,
    notes: null,
    metadata: { table: { name: "a", row_count: 2 } },
    coverage_start_date: null,
    coverage_end_date: null,
    api_service: "ckan",
    api_base_url: DRIVE,
    api_resource_id: "etl-fixture-resource",
    api_resource_format: "CSV",
    parquet_file_name: null,
    ...overrides,
  };
}

function _parquetRow(
  overrides: Partial<ListingRowValues> = {},
): ListingRowValues {
  return _apiRow({
    access_kind: "pipeline_parquet",
    api_service: null,
    api_base_url: null,
    api_resource_id: null,
    api_resource_format: null,
    parquet_file_name: "etl-fixture.parquet",
    ...overrides,
  });
}

async function _countRows(): Promise<number> {
  const { count } = await client
    .from(LISTINGS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("pipeline_name", PIPELINE_NAME);
  return count ?? 0;
}

afterEach(async () => {
  await client
    .from(LISTINGS_TABLE)
    .delete()
    .in("pipeline_name", [PIPELINE_NAME, OTHER_PIPELINE_NAME]);
});

describe("createSupabaseListingsStore", () => {
  it("upserts an API relation onto one row by its conflict key", async () => {
    await store.upsertRows([_apiRow()]);
    const [second] = await store.upsertRows([
      _apiRow({ display_name: "Renamed" }),
    ]);

    expect([await _countRows(), second?.display_name]).toEqual([
      1,
      "Renamed",
    ]);
  });

  it("upserts a Parquet relation onto one row by its conflict key", async () => {
    await store.upsertRows([_parquetRow()]);
    await store.upsertRows([_parquetRow({ display_name: "Renamed" })]);

    expect(await _countRows()).toBe(1);
  });

  it("rejects a batch that repeats a listing key and writes none of its rows", async () => {
    const rows = [
      _apiRow({ external_dataset_id: "etl-fixture-other-dataset" }),
      _apiRow(),
      _apiRow({ display_name: "Renamed" }),
    ];

    await expect(store.upsertRows(rows)).rejects.toThrow(
      "cannot affect row a second time",
    );
    expect(await _countRows()).toBe(0);
  });

  it("reads the newest date_of_last_update for one pipeline and drive only", async () => {
    await store.upsertRows([
      _apiRow({
        external_dataset_id: "a",
        date_of_last_update: "2026-10-01T00:00:00.000Z",
      }),
      _apiRow({
        external_dataset_id: "b",
        date_of_last_update: "2026-10-05T00:00:00.000Z",
      }),
      _apiRow({
        external_dataset_id: "c",
        date_of_last_update: "2026-10-09T00:00:00.000Z",
        api_base_url: OTHER_DRIVE,
      }),
      _apiRow({
        external_dataset_id: "d",
        date_of_last_update: "2026-10-12T00:00:00.000Z",
        pipeline_name: OTHER_PIPELINE_NAME,
      }),
    ]);

    await expect(
      store.readHighWaterMark({
        pipelineName: PIPELINE_NAME,
        apiBaseUrl: DRIVE,
      }),
    ).resolves.toEqual(new Date("2026-10-05T00:00:00.000Z"));
  });

  it("reads back a written row that the change check sees as unchanged", async () => {
    const row = _apiRow();
    await store.upsertRows([row]);

    const [stored] = await store.readRowsMatching([row]);

    expect(
      stored !== undefined && isListingRowUnchanged({ stored, next: row }),
    ).toBe(true);
  });

  it("returns one stored row when the same key is asked for twice", async () => {
    const row = _apiRow();
    await store.upsertRows([row]);

    const stored = await store.readRowsMatching([row, row]);

    expect(stored).toHaveLength(1);
  });

  it("reads only the asked-for resource of a dataset that has several", async () => {
    const wanted = _apiRow({ api_resource_id: "etl-fixture-resource-1" });
    await store.upsertRows([
      wanted,
      _apiRow({ api_resource_id: "etl-fixture-resource-2" }),
    ]);

    const stored = await store.readRowsMatching([wanted]);

    expect(
      stored.map((row) => {
        return row.api_resource_id;
      }),
    ).toEqual(["etl-fixture-resource-1"]);
  });

  it("reads back every row of a 200-row chunk whose dataset ids are 100 characters", async () => {
    // 100 characters is CKAN's longest dataset name, and HDX listings use the
    // name as `external_dataset_id`.
    const rows = Array.from({ length: 200 }, () => {
      return _apiRow({
        external_dataset_id: `etl-fixture-${randomUUID()}`.padEnd(100, "x"),
      });
    });
    await store.upsertRows(rows);

    const stored = await store.readRowsMatching(rows);

    expect(stored).toHaveLength(200);
  });

  it("replaces a listing's relation columns as a whole", async () => {
    const [stored] = await store.upsertRows([_apiRow()]);
    const listingId = stored?.id ?? "";
    await store.replaceRelationColumns({
      listingId,
      columns: [
        {
          column_name: "a",
          display_order: 0,
          original_data_type: "text",
          cast_data_type: "VARCHAR",
        },
        {
          column_name: "b",
          display_order: 1,
          original_data_type: "text",
          cast_data_type: "VARCHAR",
        },
      ],
    });
    await store.replaceRelationColumns({
      listingId,
      columns: [
        {
          column_name: "c",
          display_order: 0,
          original_data_type: "float",
          cast_data_type: "DOUBLE",
        },
      ],
    });

    const { data } = await client
      .from(COLUMNS_TABLE)
      .select("column_name")
      .eq("catalog_listing_id", listingId);
    expect(data).toEqual([{ column_name: "c" }]);
  });

  it("leaves an existing row's cache columns untouched", async () => {
    const [stored] = await store.upsertRows([_apiRow()]);
    await client
      .from(LISTINGS_TABLE)
      .update({
        cached_object_path: "etl-fixture/cache.csv",
        cached_source_version: "v1",
        cached_at: "2026-10-20T00:00:00.000Z",
      })
      .eq("id", stored?.id ?? "");

    await store.upsertRows([_apiRow({ display_name: "Renamed" })]);

    const { data } = await client
      .from(LISTINGS_TABLE)
      .select("cached_object_path")
      .eq("id", stored?.id ?? "")
      .single();
    expect(data).toEqual({ cached_object_path: "etl-fixture/cache.csv" });
  });
});
