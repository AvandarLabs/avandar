import { buildListingKeyFromRow } from "@etl/stores/buildListingKeyFromRow/buildListingKeyFromRow";
import { describe, expect, it } from "vitest";
import type { ListingRowValues } from "@etl/stores/EtlStores.types";

function _apiRow(overrides: Partial<ListingRowValues> = {}): ListingRowValues {
  return {
    access_kind: "api_resource",
    pipeline_name: "hdx",
    pipeline_run_id: "run-1",
    display_name: "Dataset",
    external_organization_name: "HDX",
    external_dataset_id: "movement-range-maps",
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
    api_service: "ckan",
    api_base_url: "https://data.humdata.org",
    api_resource_id: "resource-a",
    api_resource_format: "CSV",
    parquet_file_name: null,
    ...overrides,
  };
}

describe("buildListingKeyFromRow", () => {
  it("gives two resources of one API dataset different keys", () => {
    expect(buildListingKeyFromRow(_apiRow())).not.toBe(
      buildListingKeyFromRow(_apiRow({ api_resource_id: "resource-b" })),
    );
  });

  it("gives an API row the same key whatever run wrote it", () => {
    expect(buildListingKeyFromRow(_apiRow())).toBe(
      buildListingKeyFromRow(
        _apiRow({ pipeline_run_id: "run-2", display_name: "Renamed" }),
      ),
    );
  });

  it("keys a Parquet row by pipeline and file name", () => {
    const parquetRow = _apiRow({
      access_kind: "pipeline_parquet",
      pipeline_name: "world-bank__wdi",
      api_service: null,
      api_base_url: null,
      api_resource_id: null,
      api_resource_format: null,
      parquet_file_name: "WDICSV.parquet",
    });

    expect(buildListingKeyFromRow(parquetRow)).not.toBe(
      buildListingKeyFromRow({
        ...parquetRow,
        parquet_file_name: "WDISeries.parquet",
      }),
    );
  });
});
