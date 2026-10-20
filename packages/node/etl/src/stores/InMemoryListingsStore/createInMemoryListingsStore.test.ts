import { createInMemoryListingsStore } from "@etl/stores/InMemoryListingsStore/createInMemoryListingsStore";
import { describe, expect, it } from "vitest";
import type {
  ListingRowValues,
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

describe("createInMemoryListingsStore", () => {
  it("reads the newest date_of_last_update for one pipeline and drive", async () => {
    const store = createInMemoryListingsStore({
      rows: [
        _stored("a", { date_of_last_update: "2026-10-01T00:00:00.000Z" }),
        _stored("b", { date_of_last_update: "2026-10-05T00:00:00.000Z" }),
        _stored("c", {
          date_of_last_update: "2026-10-09T00:00:00.000Z",
          api_base_url: "https://data.cityofchicago.org",
        }),
        _stored("d", {
          date_of_last_update: "2026-10-12T00:00:00.000Z",
          pipeline_name: "hdx",
        }),
      ],
    });

    await expect(
      store.readHighWaterMark({ pipelineName: "socrata", apiBaseUrl: DRIVE }),
    ).resolves.toEqual(new Date("2026-10-05T00:00:00.000Z"));
  });

  it("has no high-water mark for a drive with no dated rows", async () => {
    const store = createInMemoryListingsStore({ rows: [_stored("a")] });

    await expect(
      store.readHighWaterMark({ pipelineName: "socrata", apiBaseUrl: DRIVE }),
    ).resolves.toBeUndefined();
  });

  it("keeps a row's id when the same key is upserted again", async () => {
    const store = createInMemoryListingsStore();
    const [first] = await store.upsertRows([_row()]);
    const [second] = await store.upsertRows([
      _row({ display_name: "Renamed" }),
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

  it("replaces a listing's relation columns as a whole", async () => {
    const store = createInMemoryListingsStore();
    await store.replaceRelationColumns({
      listingId: "listing-1",
      columns: [
        {
          column_name: "a",
          display_order: 0,
          original_data_type: "VARCHAR",
          cast_data_type: "VARCHAR",
        },
        {
          column_name: "b",
          display_order: 1,
          original_data_type: "VARCHAR",
          cast_data_type: "VARCHAR",
        },
      ],
    });
    await store.replaceRelationColumns({
      listingId: "listing-1",
      columns: [
        {
          column_name: "c",
          display_order: 0,
          original_data_type: "DOUBLE",
          cast_data_type: "DOUBLE",
        },
      ],
    });

    expect(
      store.getRelationColumns("listing-1")?.map((column) => {
        return column.column_name;
      }),
    ).toEqual(["c"]);
  });

  it("fails the whole batch when two rows share a key", async () => {
    const store = createInMemoryListingsStore();

    await expect(
      store.upsertRows([
        _row({ external_dataset_id: "a", api_resource_id: "a" }),
        _row({ external_dataset_id: "b", api_resource_id: "b" }),
        _row({
          external_dataset_id: "a",
          api_resource_id: "a",
          display_name: "Again",
        }),
      ]),
    ).rejects.toThrow(
      "ON CONFLICT DO UPDATE command cannot affect row a second time",
    );
    expect([store.getRows().length, store.getUpsertBatches().length]).toEqual([
      0, 0,
    ]);
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
    await store.upsertRows([_row({ metadata })]);

    metadata.count = 2;

    expect(store.getRows()[0]?.metadata).toEqual({ count: 1 });
  });

  it("is not changed by editing the rows an upsert returns", async () => {
    const store = createInMemoryListingsStore();
    const [stored] = await store.upsertRows([_row({ metadata: { count: 1 } })]);

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
    await store.replaceRelationColumns({ listingId: "listing-1", columns });

    columns.push(_column("b", 1));

    expect(store.getRelationColumns("listing-1")).toHaveLength(1);
  });

  it("is not changed by editing the relation columns a read returns", async () => {
    const store = createInMemoryListingsStore();
    await store.replaceRelationColumns({
      listingId: "listing-1",
      columns: [_column("a", 0)],
    });

    Object.assign(store.getRelationColumns("listing-1")?.[0] ?? {}, {
      column_name: "z",
    });

    expect(store.getRelationColumns("listing-1")?.[0]?.column_name).toBe("a");
  });

  it("ignores a stored row whose date does not parse", async () => {
    const store = createInMemoryListingsStore({
      rows: [
        _stored("a", { date_of_last_update: "not a date" }),
        _stored("b", { date_of_last_update: "2026-10-05T00:00:00.000Z" }),
      ],
    });

    await expect(
      store.readHighWaterMark({ pipelineName: "socrata", apiBaseUrl: DRIVE }),
    ).resolves.toEqual(new Date("2026-10-05T00:00:00.000Z"));
  });

  it("has no high-water mark when no stored date parses", async () => {
    const store = createInMemoryListingsStore({
      rows: [_stored("a", { date_of_last_update: "not a date" })],
    });

    await expect(
      store.readHighWaterMark({ pipelineName: "socrata", apiBaseUrl: DRIVE }),
    ).resolves.toBeUndefined();
  });

  it("stores and returns rows the way Postgres would, as JSON", async () => {
    const store = createInMemoryListingsStore();

    const [stored] = await store.upsertRows([
      _row({
        metadata: {
          kept: 1,
          dropped: undefined,
          when: new Date("2026-10-19T08:30:00.000Z"),
        },
      }),
    ]);

    expect(stored?.metadata).toEqual({
      kept: 1,
      when: "2026-10-19T08:30:00.000Z",
    });
    expect(Object.keys(stored?.metadata ?? {})).not.toContain("dropped");
  });
});
