import { describe, expect, it } from "vitest";
import { DataCatalogListingParsers } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers.ts";
import type { DataCatalogListingModel } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts";

const TIMESTAMP = "2026-08-19T00:00:00+00:00";

/**
 * The columns every catalog listing carries, whichever access shape it uses.
 * Spread into each fixture so a test body shows only the fields it is about.
 */
const SHARED_DB_COLUMNS = {
  id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  date_of_last_sync: null,
  date_of_last_update: null,
  coverage_start_date: null,
  coverage_end_date: null,
  external_service_name: null,
  source_url: null,
  canonical_urls: null,
  license: null,
  update_frequency: null,
  description: null,
  notes: null,
  metadata: null,
  cached_object_path: null,
  cached_source_version: null,
  cached_at: null,
  parquet_cache_status: null,
  parquet_cache_build_id: null,
  parquet_cache_build_started_at: null,
  parquet_cache_failure_code: null,
  parquet_cache_folder_path: null,
  parquet_cache_part_count: null,
  parquet_cache_source_version: null,
  parquet_cache_built_at: null,
  parquet_cache_row_count: null,
  parquet_cache_byte_size: null,
  pipeline_scope_keys: [] as string[],
  date_column_type_last_verified: null,
  is_invalid: false,
  invalid_dataset_reason: null,
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
  search_vector: "'seri':1A 'world':2B 'bank':3B",
} as const;

function _pipelineDBRow(): DataCatalogListingModel["DBRead"] {
  return {
    ...SHARED_DB_COLUMNS,
    display_name: "Series",
    organization1_name: "World Bank",
    external_dataset_id: "series",
    access_kind: "pipeline_parquet",
    parquet_file_name: "series.parquet",
    pipeline_name: "world-bank__wdi",
    pipeline_run_id: "run-1",
    api_service: null,
    api_base_url: null,
    api_resource_id: null,
    api_resource_format: null,
  };
}

function _apiDBRow(): DataCatalogListingModel["DBRead"] {
  return {
    ...SHARED_DB_COLUMNS,
    display_name: "Operational Presence",
    organization1_name: "OCHA",
    external_dataset_id: "hdx-hapi-operational-presence",
    access_kind: "api_resource",
    parquet_file_name: null,
    pipeline_name: null,
    pipeline_run_id: null,
    api_service: "ckan",
    api_base_url: "https://data.humdata.org",
    api_resource_id: "e3a18c4c-ec1b-457e-9f60-cee283c04e0c",
    api_resource_format: "CSV",
  };
}

describe("DataCatalogListingParsers", () => {
  it("reads an API entry with no Parquet object and no pipeline", () => {
    const entry = DataCatalogListingParsers.fromDBReadToModelRead(
      DataCatalogListingParsers.DBReadSchema.parse(_apiDBRow()),
    );

    expect(entry.accessKind).toBe("api_resource");
    expect(entry.apiService).toBe("ckan");
    expect(entry.apiBaseUrl).toBe("https://data.humdata.org");
    expect(entry.apiResourceId).toBe("e3a18c4c-ec1b-457e-9f60-cee283c04e0c");
    expect(entry.apiResourceFormat).toBe("CSV");
    expect(entry.parquetFileName).toBeUndefined();
    expect(entry.pipelineName).toBeUndefined();
    expect(entry.pipelineRunId).toBeUndefined();
  });

  it("reads a pipeline entry with no API columns", () => {
    const entry = DataCatalogListingParsers.fromDBReadToModelRead(
      DataCatalogListingParsers.DBReadSchema.parse(_pipelineDBRow()),
    );

    expect(entry.accessKind).toBe("pipeline_parquet");
    expect(entry.parquetFileName).toBe("series.parquet");
    expect(entry.pipelineName).toBe("world-bank__wdi");
    expect(entry.pipelineRunId).toBe("run-1");
    expect(entry.apiService).toBeUndefined();
    expect(entry.apiBaseUrl).toBeUndefined();
    expect(entry.apiResourceId).toBeUndefined();
    expect(entry.apiResourceFormat).toBeUndefined();
  });

  it("leaves the search document out of the model", () => {
    const entry = DataCatalogListingParsers.fromDBReadToModelRead(
      DataCatalogListingParsers.DBReadSchema.parse(_pipelineDBRow()),
    );

    expect(entry).not.toHaveProperty("searchVector");
  });

  it("keeps the source record's keys and nulls as the source sent them", () => {
    const sourceRecord = {
      resource: { id: "8wbx-tsch", page_views: { last_week: null } },
      classification: { domain_category: "Transportation" },
    };
    const entry = DataCatalogListingParsers.fromDBReadToModelRead(
      DataCatalogListingParsers.DBReadSchema.parse({
        ..._apiDBRow(),
        additional_source_metadata: sourceRecord,
      }),
    );

    expect(entry.additionalSourceMetadata).toEqual(sourceRecord);
  });

  it("keeps the metadata's keys and nulls as the pipeline wrote them", () => {
    const metadata = { table: { column_names: ["year"], row_count: null } };
    const entry = DataCatalogListingParsers.fromDBReadToModelRead(
      DataCatalogListingParsers.DBReadSchema.parse({
        ..._pipelineDBRow(),
        metadata,
      }),
    );

    expect(entry.metadata).toEqual(metadata);
  });

  it("reads a missing source record as undefined", () => {
    const entry = DataCatalogListingParsers.fromDBReadToModelRead(
      DataCatalogListingParsers.DBReadSchema.parse(_apiDBRow()),
    );

    expect(entry.additionalSourceMetadata).toBeUndefined();
  });

  it("rejects an unknown access kind", () => {
    const row = { ..._apiDBRow(), access_kind: "sftp_drop" };

    expect(() => {
      return DataCatalogListingParsers.DBReadSchema.parse(row);
    }).toThrow();
  });

  it("rejects an unknown API service", () => {
    const row = { ..._apiDBRow(), api_service: "arcgis" };

    expect(() => {
      return DataCatalogListingParsers.DBReadSchema.parse(row);
    }).toThrow();
  });

  it("writes an API entry back to snake case", () => {
    const dbInsert = DataCatalogListingParsers.fromModelInsertToDBInsert({
      ...DataCatalogListingParsers.fromDBReadToModelRead(
        DataCatalogListingParsers.DBReadSchema.parse(_apiDBRow()),
      ),
    });

    expect(dbInsert.api_resource_id).toBe(
      "e3a18c4c-ec1b-457e-9f60-cee283c04e0c",
    );
    expect(dbInsert.access_kind).toBe("api_resource");
  });
});
