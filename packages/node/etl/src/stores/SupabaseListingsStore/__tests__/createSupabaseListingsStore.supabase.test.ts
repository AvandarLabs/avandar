import { randomUUID } from "node:crypto";
import { isListingRowUnchanged } from "@etl/EtlEngine/isListingRowUnchanged/isListingRowUnchanged";
import { createSupabaseListingsStore } from "@etl/stores/SupabaseListingsStore/createSupabaseListingsStore";
import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type {
  ListingRowValues,
  RelationColumnRow,
} from "@etl/stores/EtlStores.types";

const LISTINGS_TABLE = "data_catalog_listings";
const COLUMNS_TABLE = "data_catalog_listings__relation_columns";
const UPSERT_FUNCTION =
  "rpc_data_catalog_listings__upsert_with_relation_columns";
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
  upsertListingsFunction: UPSERT_FUNCTION,
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
    pipeline_scope_keys: ["all"],
    date_column_type_last_verified: null,
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

function _column(name: string, displayOrder = 0): RelationColumnRow {
  return {
    column_name: name,
    display_order: displayOrder,
    original_data_type: "text",
    cast_data_type: "VARCHAR",
  };
}

/** Upserts each row with one relation column, `a`, in one call. */
function _upsert(rows: readonly ListingRowValues[]) {
  return store.upsertListingsWithColumns(
    rows.map((row) => {
      return { row, columns: [_column("a")] };
    }),
  );
}

async function _readColumnNames(listingId: string): Promise<string[]> {
  const { data, error } = await client
    .from(COLUMNS_TABLE)
    .select("column_name")
    .eq("catalog_listing_id", listingId)
    .order("display_order");
  expect(error).toBeNull();
  return (data ?? []).map((column) => {
    return column.column_name;
  });
}

function _resourceRows(args: {
  datasetId: string;
  count: number;
}): ListingRowValues[] {
  return Array.from({ length: args.count }, (_, index) => {
    return _apiRow({
      external_dataset_id: args.datasetId,
      api_resource_id: `etl-fixture-resource-${index}`,
    });
  });
}

function _resourceIdsOf(rows: readonly ListingRowValues[]): string[] {
  return rows
    .map((row) => {
      return row.api_resource_id ?? "";
    })
    .sort();
}

async function _countRows(): Promise<number> {
  const { count } = await client
    .from(LISTINGS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("pipeline_name", PIPELINE_NAME);
  return count ?? 0;
}

beforeAll(async () => {
  // Removes what a crashed earlier run left behind, so no fixture key below
  // lands on a stale row.
  const sweeps = await Promise.all([
    client.from(LISTINGS_TABLE).delete().like("pipeline_name", "etl-fixture-%"),
    client
      .from(LISTINGS_TABLE)
      .delete()
      .in("api_base_url", [DRIVE, OTHER_DRIVE]),
  ]);
  expect(
    sweeps.map(({ error }) => {
      return error;
    }),
  ).toEqual([null, null]);
});

afterEach(async () => {
  const { error } = await client
    .from(LISTINGS_TABLE)
    .delete()
    .in("pipeline_name", [PIPELINE_NAME, OTHER_PIPELINE_NAME]);
  expect(error).toBeNull();
});

describe("createSupabaseListingsStore", () => {
  it("upserts an API relation onto one row by its conflict key", async () => {
    await _upsert([_apiRow()]);
    const [second] = await _upsert([_apiRow({ display_name: "Renamed" })]);

    expect([await _countRows(), second?.display_name]).toEqual([1, "Renamed"]);
  });

  it("upserts a Parquet relation onto one row by its conflict key", async () => {
    await _upsert([_parquetRow()]);
    await _upsert([_parquetRow({ display_name: "Renamed" })]);

    expect(await _countRows()).toBe(1);
  });

  it("rejects a batch that repeats a listing key and writes none of its rows", async () => {
    const rows = [
      _apiRow({ external_dataset_id: "etl-fixture-other-dataset" }),
      _apiRow(),
      _apiRow({ display_name: "Renamed" }),
    ];

    await expect(_upsert(rows)).rejects.toThrow(
      'Listing "Renamed" appears twice in one call',
    );
    expect(await _countRows()).toBe(0);
  });

  it("writes both listing kinds in one call", async () => {
    await _upsert([_apiRow(), _parquetRow()]);

    expect(await _countRows()).toBe(2);
  });

  it("names the database error code and keeps its error as the cause", async () => {
    await expect(
      _upsert([_apiRow(), _apiRow({ display_name: "Renamed" })]),
    ).rejects.toMatchObject({
      message: expect.stringContaining("code P0001"),
      cause: { code: "P0001" },
    });
  });

  it("stores a listing with every one of its columns", async () => {
    const [stored] = await store.upsertListingsWithColumns([
      { row: _apiRow(), columns: [_column("a", 0), _column("b", 1)] },
    ]);

    expect(await _readColumnNames(stored?.id ?? "")).toEqual(["a", "b"]);
  });

  it("stores an entry with no columns, with an empty column set", async () => {
    const [stored] = await store.upsertListingsWithColumns([
      { row: _apiRow(), columns: [] },
    ]);

    expect([
      await _countRows(),
      await _readColumnNames(stored?.id ?? ""),
    ]).toEqual([1, []]);
  });

  it("keeps a stored listing's columns when a later entry in the call fails", async () => {
    const [stored] = await store.upsertListingsWithColumns([
      { row: _apiRow(), columns: [_column("old")] },
    ]);

    await expect(
      store.upsertListingsWithColumns([
        {
          row: _apiRow({ display_name: "Renamed" }),
          columns: [_column("new")],
        },
        {
          row: _apiRow({ display_name: "Again" }),
          columns: [_column("new")],
        },
      ]),
    ).rejects.toThrow("appears twice in one call");
    expect(await _readColumnNames(stored?.id ?? "")).toEqual(["old"]);
  });

  it("refuses more listings than PostgREST returns in one response", async () => {
    await expect(
      _upsert(_resourceRows({ datasetId: "etl-fixture-dataset", count: 1001 })),
    ).rejects.toThrow("at most 1000 listings per call");
    expect(await _countRows()).toBe(0);
  });

  it("writes only contract columns when a row carries other properties", async () => {
    const rowWithCacheColumn = {
      ..._apiRow(),
      cached_object_path: "etl-fixture/stray.csv",
    };

    const [stored] = await _upsert([rowWithCacheColumn]);

    const { data } = await client
      .from(LISTINGS_TABLE)
      .select("cached_object_path")
      .eq("id", stored?.id ?? "")
      .single();
    expect(data).toEqual({ cached_object_path: null });
  });

  it("reads back a written row that the change check sees as unchanged", async () => {
    const row = _apiRow();
    await _upsert([row]);

    const [stored] = await store.readRowsMatching([row]);

    expect(
      stored !== undefined && isListingRowUnchanged({ stored, next: row }),
    ).toBe(true);
  });

  it("round-trips a row's scope keys in order", async () => {
    await _upsert([
      _apiRow({ pipeline_scope_keys: ["format:csv", "category:health"] }),
    ]);

    const [stored] = await store.readRowsMatching([_apiRow()]);

    expect(stored?.pipeline_scope_keys).toEqual([
      "format:csv",
      "category:health",
    ]);
  });

  it("returns one stored row when the same key is asked for twice", async () => {
    const row = _apiRow();
    await _upsert([row]);

    const stored = await store.readRowsMatching([row, row]);

    expect(stored).toHaveLength(1);
  });

  it("reads exactly the 2 asked-for resources of a dataset that has 5", async () => {
    const rows = _resourceRows({ datasetId: "etl-fixture-dataset", count: 5 });
    await _upsert(rows);
    const wanted = rows.filter((_, index) => {
      return index === 1 || index === 3;
    });

    const stored = await store.readRowsMatching(wanted);

    expect(_resourceIdsOf(stored)).toEqual(_resourceIdsOf(wanted));
  });

  it("reads every resource of a dataset with more resources than one response holds", async () => {
    // PostgREST returns at most 1000 rows per request, without an error.
    const rows = _resourceRows({
      datasetId: "etl-fixture-dataset",
      count: 1001,
    });
    await _upsert(rows.slice(0, 1000));
    await _upsert(rows.slice(1000));

    const stored = await store.readRowsMatching(rows);

    expect(stored).toHaveLength(1001);
  });

  it("reads back every row of a 200-row chunk whose ids are 100 characters", async () => {
    // 100 characters is CKAN's longest dataset name, and HDX listings use the
    // name as `external_dataset_id`. Resource ids get the same length, to
    // leave room beyond CKAN's 36-character resource UUIDs.
    const rows = Array.from({ length: 200 }, () => {
      return _apiRow({
        external_dataset_id: `etl-fixture-${randomUUID()}`.padEnd(100, "x"),
        api_resource_id: `etl-fixture-${randomUUID()}`.padEnd(100, "y"),
      });
    });
    await _upsert(rows);

    const stored = await store.readRowsMatching(rows);

    expect(stored).toHaveLength(200);
  });

  it("reads a Parquet listing back by its pipeline and file name", async () => {
    const wanted = _parquetRow({ parquet_file_name: "etl-fixture-a.parquet" });
    await _upsert([
      wanted,
      _parquetRow({ parquet_file_name: "etl-fixture-b.parquet" }),
    ]);

    const stored = await store.readRowsMatching([wanted]);

    expect(
      stored.map((row) => {
        return row.parquet_file_name;
      }),
    ).toEqual(["etl-fixture-a.parquet"]);
  });

  it("keeps verified columns when an unverified rewrite has the same columns fingerprint", async () => {
    const metadata = { relation_columns_sha256: "fp-1" };
    const [stored] = await store.upsertListingsWithColumns([
      {
        row: _apiRow({
          metadata,
          date_column_type_last_verified: "2026-10-20T00:00:00.000Z",
        }),
        columns: [_column("verified")],
      },
    ]);

    const [rewritten] = await store.upsertListingsWithColumns([
      {
        row: _apiRow({ metadata, display_name: "Renamed" }),
        columns: [_column("piped")],
      },
    ]);

    expect([
      rewritten?.display_name,
      Date.parse(rewritten?.date_column_type_last_verified ?? ""),
      await _readColumnNames(stored?.id ?? ""),
    ]).toEqual([
      "Renamed",
      Date.parse("2026-10-20T00:00:00.000Z"),
      ["verified"],
    ]);
  });

  it("replaces a listing's relation columns as a whole", async () => {
    await store.upsertListingsWithColumns([
      { row: _apiRow(), columns: [_column("a", 0), _column("b", 1)] },
    ]);
    const [stored] = await store.upsertListingsWithColumns([
      { row: _apiRow(), columns: [_column("c", 0)] },
    ]);

    expect(await _readColumnNames(stored?.id ?? "")).toEqual(["c"]);
  });

  it("round-trips a row with every contract column set", async () => {
    const row = _apiRow({
      external_service_name: "Fixture API",
      source_url: "https://etl-fixture.invalid/source",
      license: "CC-BY-4.0",
      update_frequency: "daily",
      description: "A description",
      notes: "Some notes",
      coverage_start_date: "2020-01-01T00:00:00.000Z",
      coverage_end_date: "2021-01-01T00:00:00.000Z",
    });
    await _upsert([row]);

    const [stored] = await store.readRowsMatching([row]);

    expect(
      stored !== undefined && isListingRowUnchanged({ stored, next: row }),
    ).toBe(true);
  });

  it("leaves an existing row's cache columns untouched", async () => {
    const [stored] = await _upsert([_apiRow()]);
    await client
      .from(LISTINGS_TABLE)
      .update({
        cached_object_path: "etl-fixture/cache.csv",
        cached_source_version: "v1",
        cached_at: "2026-10-20T00:00:00.000Z",
      })
      .eq("id", stored?.id ?? "");

    await _upsert([_apiRow({ display_name: "Renamed" })]);

    const { data } = await client
      .from(LISTINGS_TABLE)
      .select("cached_object_path")
      .eq("id", stored?.id ?? "")
      .single();
    expect(data).toEqual({ cached_object_path: "etl-fixture/cache.csv" });
  });
});
