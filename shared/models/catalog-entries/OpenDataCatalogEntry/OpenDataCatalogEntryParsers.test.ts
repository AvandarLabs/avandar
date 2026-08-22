import type { OpenDataCatalogEntryModel } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts";

import { describe, expect, it } from "vitest";

import { OpenDataCatalogEntryParsers } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers.ts";

const TIMESTAMP = "2026-08-19T00:00:00+00:00";

/**
 * The columns every catalog entry carries, whichever access shape it uses.
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
} as const;

function _pipelineDBRow(): OpenDataCatalogEntryModel["DBRead"] {
  return {
    ...SHARED_DB_COLUMNS,
    display_name: "Series",
    external_organization_name: "World Bank",
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

function _apiDBRow(): OpenDataCatalogEntryModel["DBRead"] {
  return {
    ...SHARED_DB_COLUMNS,
    display_name: "Operational Presence",
    external_organization_name: "OCHA",
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

describe("OpenDataCatalogEntryParsers", () => {
  it("reads an API entry with no Parquet object and no pipeline", () => {
    const entry = OpenDataCatalogEntryParsers.fromDBReadToModelRead(
      OpenDataCatalogEntryParsers.DBReadSchema.parse(_apiDBRow()),
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
    const entry = OpenDataCatalogEntryParsers.fromDBReadToModelRead(
      OpenDataCatalogEntryParsers.DBReadSchema.parse(_pipelineDBRow()),
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

  it("rejects an unknown access kind", () => {
    const row = { ..._apiDBRow(), access_kind: "sftp_drop" };

    expect(() => {
      return OpenDataCatalogEntryParsers.DBReadSchema.parse(row);
    }).toThrow();
  });

  it("rejects an unknown API service", () => {
    const row = { ..._apiDBRow(), api_service: "socrata" };

    expect(() => {
      return OpenDataCatalogEntryParsers.DBReadSchema.parse(row);
    }).toThrow();
  });

  it("writes an API entry back to snake case", () => {
    const dbInsert = OpenDataCatalogEntryParsers.fromModelInsertToDBInsert({
      ...OpenDataCatalogEntryParsers.fromDBReadToModelRead(
        OpenDataCatalogEntryParsers.DBReadSchema.parse(_apiDBRow()),
      ),
    });

    expect(dbInsert.api_resource_id).toBe(
      "e3a18c4c-ec1b-457e-9f60-cee283c04e0c",
    );
    expect(dbInsert.access_kind).toBe("api_resource");
  });
});
