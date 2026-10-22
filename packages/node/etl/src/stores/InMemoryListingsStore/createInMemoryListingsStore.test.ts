import { createInMemoryListingsStore } from "@etl/stores/InMemoryListingsStore/createInMemoryListingsStore";
import { describe, expect, it } from "vitest";
import type {
  ListingRowValues,
  ListingWithColumns,
  RelationColumnRow,
  StoredListingRow,
} from "@etl/stores/EtlStores.types";

const DRIVE = "https://data.cityofnewyork.us";

function _row(overrides: Partial<ListingRowValues> = {}): ListingRowValues {
  return {
    access_kind: "api_resource",
    pipeline_name: "socrata",
    pipeline_run_id: "run-1",
    display_name: "Dataset",
    external_organization_name: "City of New York",
    external_dataset_id: "abcd-1234",
    date_of_last_update: null,
    date_of_last_sync: "2026-10-20T00:00:00.000Z",
    external_service_name: null,
    source_url: null,
    canonical_urls: null,
    license: null,
    update_frequency: null,
    description: null,
    notes: null,
    metadata: null,
    coverage_start_date: null,
    coverage_end_date: null,
    api_service: "socrata",
    api_base_url: DRIVE,
    api_resource_id: "abcd-1234",
    api_resource_format: "CSV",
    parquet_file_name: null,
    pipeline_scope_keys: ["all"],
    date_column_type_last_verified: null,
    ...overrides,
  };
}

function _stored(
  id: string,
  overrides: Partial<ListingRowValues> = {},
): StoredListingRow {
  return {
    ..._row({ external_dataset_id: id, api_resource_id: id, ...overrides }),
    id,
  };
}

function _column(name: string, displayOrder: number): RelationColumnRow {
  return {
    column_name: name,
    display_order: displayOrder,
    original_data_type: "VARCHAR",
    cast_data_type: "VARCHAR",
  };
}

function _entry(
  row: ListingRowValues,
  columns: readonly RelationColumnRow[] = [_column("a", 0)],
): ListingWithColumns {
  return { row, columns };
}

function _columnNames(columns: readonly RelationColumnRow[] | undefined) {
  return columns?.map((column) => {
    return column.column_name;
  });
}

describe("createInMemoryListingsStore", () => {
  it("keeps a row's id when the same key is upserted again", async () => {
    const store = createInMemoryListingsStore();
    const [first] = await store.upsertListingsWithColumns([_entry(_row())]);
    const [second] = await store.upsertListingsWithColumns([
      _entry(_row({ display_name: "Renamed" })),
    ]);

    expect([second?.id, second?.display_name, store.getRows().length]).toEqual([
      first?.id,
      "Renamed",
      1,
    ]);
  });

  it("reads back only the stored rows whose key matches", async () => {
    const store = createInMemoryListingsStore({
      rows: [_stored("a"), _stored("b")],
    });

    const matches = await store.readRowsMatching([
      _row({ external_dataset_id: "b", api_resource_id: "b" }),
      _row({ external_dataset_id: "z", api_resource_id: "z" }),
    ]);

    expect(
      matches.map((row) => {
        return row.id;
      }),
    ).toEqual(["b"]);
  });

  it("stores a listing's columns with its row", async () => {
    const store = createInMemoryListingsStore();
    const [stored] = await store.upsertListingsWithColumns([
      _entry(_row(), [_column("a", 0), _column("b", 1)]),
    ]);

    expect(_columnNames(store.getRelationColumns(stored?.id ?? ""))).toEqual([
      "a",
      "b",
    ]);
  });

  it("replaces a listing's relation columns as a whole", async () => {
    const store = createInMemoryListingsStore();
    await store.upsertListingsWithColumns([
      _entry(_row(), [_column("a", 0), _column("b", 1)]),
    ]);
    const [stored] = await store.upsertListingsWithColumns([
      _entry(_row(), [_column("c", 0)]),
    ]);

    expect(_columnNames(store.getRelationColumns(stored?.id ?? ""))).toEqual([
      "c",
    ]);
  });

  it("keeps verified columns when an unverified rewrite has the same columns fingerprint", async () => {
    const store = createInMemoryListingsStore();
    const metadata = { relation_columns_sha256: "fp-1" };
    await store.upsertListingsWithColumns([
      _entry(
        _row({
          metadata,
          date_column_type_last_verified: "2026-10-20T00:00:00.000Z",
        }),
        [_column("verified", 0)],
      ),
    ]);

    const [stored] = await store.upsertListingsWithColumns([
      _entry(_row({ metadata, display_name: "Renamed" }), [
        _column("piped", 0),
      ]),
    ]);

    expect([
      stored?.display_name,
      stored?.date_column_type_last_verified,
      _columnNames(store.getRelationColumns(stored?.id ?? "")),
    ]).toEqual(["Renamed", "2026-10-20T00:00:00.000Z", ["verified"]]);
  });

  it("replaces verified columns when the columns fingerprint changed", async () => {
    const store = createInMemoryListingsStore();
    await store.upsertListingsWithColumns([
      _entry(
        _row({
          metadata: { relation_columns_sha256: "fp-1" },
          date_column_type_last_verified: "2026-10-20T00:00:00.000Z",
        }),
        [_column("verified", 0)],
      ),
    ]);

    const [stored] = await store.upsertListingsWithColumns([
      _entry(_row({ metadata: { relation_columns_sha256: "fp-2" } }), [
        _column("piped", 0),
      ]),
    ]);

    expect([
      stored?.date_column_type_last_verified,
      _columnNames(store.getRelationColumns(stored?.id ?? "")),
    ]).toEqual([null, ["piped"]]);
  });

  it("fails the whole call when two entries share a key", async () => {
    const store = createInMemoryListingsStore();

    await expect(
      store.upsertListingsWithColumns([
        _entry(_row({ external_dataset_id: "a", api_resource_id: "a" })),
        _entry(_row({ external_dataset_id: "b", api_resource_id: "b" })),
        _entry(
          _row({
            external_dataset_id: "a",
            api_resource_id: "a",
            display_name: "Again",
          }),
        ),
      ]),
    ).rejects.toThrow('Listing "Again" appears twice in one call');
    expect([store.getRows().length, store.getUpsertBatches().length]).toEqual([
      0, 0,
    ]);
  });

  it("stores an entry with no columns, with an empty column set", async () => {
    const store = createInMemoryListingsStore();

    const [stored] = await store.upsertListingsWithColumns([
      _entry(_row(), []),
    ]);

    expect(store.getRelationColumns(stored?.id ?? "")).toEqual([]);
  });

  it("writes both listing kinds in one call", async () => {
    const store = createInMemoryListingsStore();

    await store.upsertListingsWithColumns([
      _entry(_row()),
      _entry(
        _row({
          access_kind: "pipeline_parquet",
          api_service: null,
          api_base_url: null,
          api_resource_id: null,
          api_resource_format: null,
          parquet_file_name: "a.parquet",
        }),
      ),
    ]);

    expect(store.getRows()).toHaveLength(2);
  });

  it("returns a stored row once when several rows match its key", async () => {
    const store = createInMemoryListingsStore({ rows: [_stored("a")] });

    const matches = await store.readRowsMatching([
      _row({ external_dataset_id: "a", api_resource_id: "a" }),
      _row({
        external_dataset_id: "a",
        api_resource_id: "a",
        display_name: "Again",
      }),
    ]);

    expect(matches).toHaveLength(1);
  });

  it("is not changed by editing a seed row afterwards", async () => {
    const metadata = { count: 1 };
    const seed = _stored("a", { metadata });
    const store = createInMemoryListingsStore({ rows: [seed] });

    metadata.count = 2;

    expect(store.getRows()[0]?.metadata).toEqual({ count: 1 });
  });

  it("is not changed by editing an upserted row afterwards", async () => {
    const metadata = { count: 1 };
    const store = createInMemoryListingsStore();
    await store.upsertListingsWithColumns([_entry(_row({ metadata }))]);

    metadata.count = 2;

    expect(store.getRows()[0]?.metadata).toEqual({ count: 1 });
  });

  it("is not changed by editing the rows an upsert returns", async () => {
    const store = createInMemoryListingsStore();
    const [stored] = await store.upsertListingsWithColumns([
      _entry(_row({ metadata: { count: 1 } })),
    ]);

    Object.assign(stored?.metadata ?? {}, { count: 2 });

    expect(store.getRows()[0]?.metadata).toEqual({ count: 1 });
  });

  it("is not changed by editing the rows a read returns", async () => {
    const store = createInMemoryListingsStore({
      rows: [_stored("a", { metadata: { count: 1 } })],
    });
    const [matched] = await store.readRowsMatching([
      _row({ external_dataset_id: "a", api_resource_id: "a" }),
    ]);

    Object.assign(matched?.metadata ?? {}, { count: 2 });
    Object.assign(store.getRows()[0]?.metadata ?? {}, { count: 3 });

    expect(store.getRows()[0]?.metadata).toEqual({ count: 1 });
  });

  it("is not changed by editing a relation column list afterwards", async () => {
    const store = createInMemoryListingsStore();
    const columns: RelationColumnRow[] = [_column("a", 0)];
    const [stored] = await store.upsertListingsWithColumns([
      _entry(_row(), columns),
    ]);

    columns.push(_column("b", 1));

    expect(store.getRelationColumns(stored?.id ?? "")).toHaveLength(1);
  });

  it("is not changed by editing the relation columns a read returns", async () => {
    const store = createInMemoryListingsStore();
    const [stored] = await store.upsertListingsWithColumns([_entry(_row())]);
    const listingId = stored?.id ?? "";

    Object.assign(store.getRelationColumns(listingId)?.[0] ?? {}, {
      column_name: "z",
    });

    expect(store.getRelationColumns(listingId)?.[0]?.column_name).toBe("a");
  });

  it("stores and returns rows the way Postgres would, as JSON", async () => {
    const store = createInMemoryListingsStore();

    const [stored] = await store.upsertListingsWithColumns([
      _entry(
        _row({
          metadata: {
            kept: 1,
            dropped: undefined,
            when: new Date("2026-10-19T08:30:00.000Z"),
          },
        }),
      ),
    ]);

    expect(stored?.metadata).toEqual({
      kept: 1,
      when: "2026-10-19T08:30:00.000Z",
    });
    expect(Object.keys(stored?.metadata ?? {})).not.toContain("dropped");
  });
});
