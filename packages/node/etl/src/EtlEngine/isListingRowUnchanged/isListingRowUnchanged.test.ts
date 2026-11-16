import { isListingRowUnchanged } from "@etl/EtlEngine/isListingRowUnchanged/isListingRowUnchanged";
import { describe, expect, it } from "vitest";
import type { ListingCompanion } from "@etl/EtlEngine/EtlEngine.types";
import type {
  ListingRowValues,
  StoredListingRow,
} from "@etl/stores/EtlStores.types";

function _row(overrides: Partial<ListingRowValues> = {}): ListingRowValues {
  return {
    access_kind: "api_resource",
    pipeline_name: "socrata",
    pipeline_run_id: "run-1",
    display_name: "Rodent Inspections",
    organization1_name: "City of New York",
    external_dataset_id: "abcd-1234",
    date_of_last_update: "2026-10-19T08:30:00.000Z",
    date_of_last_sync: "2026-10-20T00:00:00.000Z",
    external_service_name: null,
    source_url: null,
    canonical_urls: ["https://data.cityofnewyork.us/d/abcd-1234"],
    license: null,
    update_frequency: null,
    description: null,
    notes: null,
    metadata: { table: { name: "a", row_count: 2 }, parquet_sha256: "x" },
    coverage_start_date: null,
    coverage_end_date: null,
    api_service: "socrata",
    api_base_url: "https://data.cityofnewyork.us",
    api_resource_id: "abcd-1234",
    api_resource_format: "CSV",
    parquet_file_name: null,
    pipeline_scope_keys: ["all"],
    date_column_type_last_verified: null,
    is_workspace_loadable: true,
    source_asset_type: null,
    source_download_url: null,
    organization2_name: null,
    organization3_name: null,
    organization4_name: null,
    domains: null,
    tags: null,
    additional_source_metadata: null,
    drive_id: null,
    companion_listings: [],
    api_freshness_probe: null,
    ...overrides,
  };
}

function _stored(overrides: Partial<ListingRowValues> = {}): StoredListingRow {
  return { ..._row(overrides), id: "listing-1" };
}

const COUNTRY_COMPANION: ListingCompanion = {
  kind: "lookup",
  externalDatasetId: "DIMENSION/COUNTRY",
  apiResourceId: "DIMENSION/COUNTRY/DimensionValues",
  joinOn: [{ column: "SpatialDim", companionColumn: "Code" }],
};

describe("isListingRowUnchanged", () => {
  it("counts a change to companion_listings", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({ companion_listings: [] }),
        next: _row({ companion_listings: [COUNTRY_COMPANION] }),
      }),
    ).toBe(false);
  });

  it("ignores companion_listings whose keys come back in another order", () => {
    // Postgres jsonb does not keep an object's key order.
    const { joinOn, kind, ...identity } = COUNTRY_COMPANION;
    expect(
      isListingRowUnchanged({
        stored: _stored({
          companion_listings: [{ joinOn, ...identity, kind }],
        }),
        next: _row({ companion_listings: [COUNTRY_COMPANION] }),
      }),
    ).toBe(true);
  });

  it("counts a change to api_freshness_probe", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({ api_freshness_probe: null }),
        next: _row({
          api_freshness_probe: {
            url: "https://data.cityofnewyork.us/abcd-1234",
            token: { kind: "body-sha256" },
          },
        }),
      }),
    ).toBe(false);
  });

  it("ignores a change to additional_source_metadata alone", () => {
    // Socrata's record carries page_views and download_count, which change
    // daily: counting them would rewrite every listing on every full run.
    expect(
      isListingRowUnchanged({
        stored: _stored({ additional_source_metadata: { page_views: 1 } }),
        next: _row({ additional_source_metadata: { page_views: 2 } }),
      }),
    ).toBe(true);
  });

  it("counts a stored row with no additional_source_metadata when the next one has it", () => {
    // A listing written before the column existed gets it on the next run,
    // without waiting for another column to change.
    expect(
      isListingRowUnchanged({
        stored: _stored({ additional_source_metadata: null }),
        next: _row({ additional_source_metadata: { title: "Trips" } }),
      }),
    ).toBe(false);
  });

  it("ignores additional_source_metadata the next row no longer has", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({ additional_source_metadata: { title: "Trips" } }),
        next: _row({ additional_source_metadata: null }),
      }),
    ).toBe(true);
  });

  it("counts a change to a mapped column", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({ tags: ["taxi"] }),
        next: _row({ tags: ["taxi", "fhv"] }),
      }),
    ).toBe(false);
  });

  it("counts a change of drive", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({ drive_id: null }),
        next: _row({ drive_id: "6f7e2c1a-0000-4000-8000-000000000001" }),
      }),
    ).toBe(false);
  });

  it("treats a row equal to the stored one as unchanged", () => {
    expect(isListingRowUnchanged({ stored: _stored(), next: _row() })).toBe(
      true,
    );
  });

  it("ignores pipeline_run_id and date_of_last_sync", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored(),
        next: _row({
          pipeline_run_id: "run-2",
          date_of_last_sync: "2026-10-21T00:00:00.000Z",
        }),
      }),
    ).toBe(true);
  });

  it("ignores date_column_type_last_verified, which the app also writes", () => {
    expect(
      isListingRowUnchanged({
        stored: {
          ..._stored(),
          date_column_type_last_verified: "2026-10-21T00:00:00.000Z",
        },
        next: _row({ date_column_type_last_verified: null }),
      }),
    ).toBe(true);
  });

  it("treats a changed display name as a change", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored(),
        next: _row({ display_name: "Rodent Inspections (2026)" }),
      }),
    ).toBe(false);
  });

  it("compares timestamps as instants, not as strings", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({ date_of_last_update: "2026-10-19T08:30:00+00:00" }),
        next: _row(),
      }),
    ).toBe(true);
  });

  it("compares metadata whatever its key order", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({
          metadata: { parquet_sha256: "x", table: { row_count: 2, name: "a" } },
        }),
        next: _row(),
      }),
    ).toBe(true);
  });

  it("treats a pipeline_name filled in for the first time as a change", () => {
    expect(
      isListingRowUnchanged({
        stored: { ..._stored(), pipeline_name: null as unknown as string },
        next: _row(),
      }),
    ).toBe(false);
  });

  it("reads a metadata round trip through JSON as unchanged", () => {
    const metadata = {
      kept: 1,
      dropped: undefined,
      when: new Date("2026-10-19T08:30:00.000Z"),
      list: [1, undefined],
    };

    expect(
      isListingRowUnchanged({
        stored: _stored({ metadata: JSON.parse(JSON.stringify(metadata)) }),
        next: _row({ metadata }),
      }),
    ).toBe(true);
  });

  it("treats a later date_of_last_update as a change", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored(),
        next: _row({ date_of_last_update: "2026-10-19T08:30:01.000Z" }),
      }),
    ).toBe(false);
  });

  it("treats a coverage date going from null to a value as a change", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored(),
        next: _row({ coverage_start_date: "2020-01-01T00:00:00.000Z" }),
      }),
    ).toBe(false);
  });

  it("treats a changed metadata value as a change", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored(),
        next: _row({
          metadata: { table: { name: "a", row_count: 3 }, parquet_sha256: "x" },
        }),
      }),
    ).toBe(false);
  });

  it("treats reordered canonical_urls as a change", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({
          canonical_urls: ["https://a.test", "https://b.test"],
        }),
        next: _row({ canonical_urls: ["https://b.test", "https://a.test"] }),
      }),
    ).toBe(false);
  });

  it("treats two different unparseable timestamps as a change", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({ date_of_last_update: "not a date" }),
        next: _row({ date_of_last_update: "also not a date" }),
      }),
    ).toBe(false);
  });

  it("treats two equal unparseable timestamps as unchanged", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored({ date_of_last_update: "not a date" }),
        next: _row({ date_of_last_update: "not a date" }),
      }),
    ).toBe(true);
  });

  it("treats a scope key added to the row as a change", () => {
    expect(
      isListingRowUnchanged({
        stored: _stored(),
        next: _row({ pipeline_scope_keys: ["all", "category:health"] }),
      }),
    ).toBe(false);
  });
});
