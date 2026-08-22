import { describe, expect, it } from "vitest";

import { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.ts";

const TIMESTAMP = "2026-08-19T00:00:00+00:00";

/**
 * A read entry with every optional field absent, so each test sets only the
 * fields its own claim depends on.
 */
function _entry(
  overrides: Partial<OpenDataCatalogEntry.T>,
): OpenDataCatalogEntry.T {
  return {
    id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90" as OpenDataCatalogEntry.Id,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    dateOfLastSync: undefined,
    dateOfLastUpdate: undefined,
    coverageStartDate: undefined,
    coverageEndDate: undefined,
    parquetFileName: undefined,
    displayName: "Some dataset",
    pipelineName: undefined,
    pipelineRunId: undefined,
    externalOrganizationName: "OCHA",
    externalServiceName: undefined,
    externalDatasetId: undefined,
    sourceUrl: undefined,
    canonicalUrls: undefined,
    license: undefined,
    updateFrequency: undefined,
    description: undefined,
    notes: undefined,
    metadata: undefined,
    accessKind: "api_resource",
    apiService: undefined,
    apiBaseUrl: undefined,
    apiResourceId: undefined,
    apiResourceFormat: undefined,
    ...overrides,
  };
}

const COMPLETE_API_FIELDS = {
  accessKind: "api_resource",
  externalDatasetId: "hdx-hapi-operational-presence",
  apiService: "ckan",
  apiBaseUrl: "https://data.humdata.org",
  apiResourceId: "e3a18c4c-ec1b-457e-9f60-cee283c04e0c",
  apiResourceFormat: "CSV",
} as const;

const COMPLETE_PIPELINE_FIELDS = {
  accessKind: "pipeline_parquet",
  parquetFileName: "series.parquet",
  pipelineName: "world-bank__wdi",
  pipelineRunId: "run-1",
} as const;

describe("OpenDataCatalogEntry.toAccess", () => {
  it("reads a pipeline entry as the pipeline shape", () => {
    expect(
      OpenDataCatalogEntry.toAccess(_entry(COMPLETE_PIPELINE_FIELDS)),
    ).toEqual({
      kind: "pipeline_parquet",
      parquetFileName: "series.parquet",
      pipelineName: "world-bank__wdi",
      pipelineRunId: "run-1",
    });
  });

  it("reads an API entry as the API shape", () => {
    expect(OpenDataCatalogEntry.toAccess(_entry(COMPLETE_API_FIELDS))).toEqual({
      kind: "api_resource",
      apiService: "ckan",
      apiBaseUrl: "https://data.humdata.org",
      ckanDatasetId: "hdx-hapi-operational-presence",
      ckanResourceId: "e3a18c4c-ec1b-457e-9f60-cee283c04e0c",
      expectedFormat: "CSV",
    });
  });

  // The database forbids these rows, but a stale client can hold one, so the
  // conversion must refuse rather than hand back a half-built shape whose null
  // checks every caller would then have to repeat.
  it.each([
    ["apiService", { apiService: undefined }],
    ["apiBaseUrl", { apiBaseUrl: undefined }],
    ["apiResourceId", { apiResourceId: undefined }],
    ["apiResourceFormat", { apiResourceFormat: undefined }],
    ["externalDatasetId", { externalDatasetId: undefined }],
  ])("refuses an API entry missing %s", (_field, missing) => {
    expect(
      OpenDataCatalogEntry.toAccess(
        _entry({ ...COMPLETE_API_FIELDS, ...missing }),
      ),
    ).toBeUndefined();
  });

  it.each([
    ["parquetFileName", { parquetFileName: undefined }],
    ["pipelineName", { pipelineName: undefined }],
    ["pipelineRunId", { pipelineRunId: undefined }],
  ])("refuses a pipeline entry missing %s", (_field, missing) => {
    expect(
      OpenDataCatalogEntry.toAccess(
        _entry({ ...COMPLETE_PIPELINE_FIELDS, ...missing }),
      ),
    ).toBeUndefined();
  });
});
