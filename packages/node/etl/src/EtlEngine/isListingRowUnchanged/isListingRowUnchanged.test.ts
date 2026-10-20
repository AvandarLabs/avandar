import { isListingRowUnchanged } from "@etl/EtlEngine/isListingRowUnchanged/isListingRowUnchanged";
import { describe, expect, it } from "vitest";
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
    external_organization_name: "City of New York",
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
    ...overrides,
  };
}

function _stored(overrides: Partial<ListingRowValues> = {}): StoredListingRow {
  return { ..._row(overrides), id: "listing-1" };
}

describe("isListingRowUnchanged", () => {
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
});
