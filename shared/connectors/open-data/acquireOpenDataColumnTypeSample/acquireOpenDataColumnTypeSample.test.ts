import { describe, expect, it, vi } from "vitest";
import {
  acquireOpenDataColumnTypeSample,
  COLUMN_TYPE_SAMPLE_MAX_BYTES,
  COLUMN_TYPE_SAMPLE_MAX_ROWS,
} from "$/connectors/open-data/acquireOpenDataColumnTypeSample/acquireOpenDataColumnTypeSample.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { ReadByteRange } from "$/connectors/open-data/acquireOpenDataColumnTypeSample/acquireOpenDataColumnTypeSample.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";

const CKAN_BASE_URL = "https://data.humdata.org";
const RESOURCE_ID = "e3a18c4c-ec1b-457e-9f60-cee283c04e0c";
const RESOURCE_URL = `${CKAN_BASE_URL}/dataset/5b89fc55/resource/e3a18c4c/download/op.csv`;
const TIMESTAMP = "2026-08-19T00:00:00+00:00";

function _entry(
  overrides: Partial<DataCatalogListing.T> = {},
): DataCatalogListing.T {
  return {
    id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90" as DataCatalogListing.Id,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    dateOfLastSync: undefined,
    dateOfLastUpdate: undefined,
    coverageStartDate: undefined,
    coverageEndDate: undefined,
    parquetFileName: undefined,
    displayName: "Operational Presence",
    pipelineName: "hdx",
    pipelineRunId: undefined,
    externalOrganizationName: "OCHA",
    externalServiceName: undefined,
    externalDatasetId: "hdx-hapi-operational-presence",
    sourceUrl: undefined,
    canonicalUrls: undefined,
    license: undefined,
    updateFrequency: undefined,
    description: undefined,
    notes: undefined,
    metadata: undefined,
    accessKind: "api_resource",
    apiService: "ckan",
    apiBaseUrl: CKAN_BASE_URL,
    apiResourceId: RESOURCE_ID,
    apiResourceFormat: "CSV",
    cachedObjectPath: undefined,
    cachedSourceVersion: undefined,
    cachedAt: undefined,
    pipelineScopeKeys: [],
    dateColumnTypeLastVerified: undefined,
    ...overrides,
  };
}

function _ckanHttp(format = "CSV"): OpenDataHttp {
  return {
    get: vi.fn(async () => {
      return {
        success: true,
        result: {
          id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
          name: "hdx-hapi-operational-presence",
          metadata_modified: "2026-08-18T08:44:07.360475",
          resources: [
            {
              id: RESOURCE_ID,
              name: "op.csv",
              format,
              url: RESOURCE_URL,
              url_type: "upload",
              size: 900_000_000,
              hash: "",
              last_modified: undefined,
              mimetype: null,
              datastore_active: false,
            },
          ],
        },
      };
    }),
    getBytes: vi.fn(),
  };
}

function _readByteRange(text: string): ReadByteRange {
  return vi.fn(async () => {
    return new TextEncoder().encode(text);
  });
}

describe("acquireOpenDataColumnTypeSample", () => {
  it("reads the start of a CKAN CSV, however large the file, and its header", async () => {
    const readByteRange = _readByteRange('"adm1","value"\nKenya,1\n');

    const sample = await acquireOpenDataColumnTypeSample({
      entry: _entry(),
      http: _ckanHttp(),
      readByteRange,
    });

    expect(sample).toEqual({
      csvText: '"adm1","value"\nKenya,1\n',
      headerNames: ["adm1", "value"],
    });
    expect(readByteRange).toHaveBeenCalledWith({
      url: RESOURCE_URL,
      maxBytes: COLUMN_TYPE_SAMPLE_MAX_BYTES,
    });
  });

  it("cuts a sample that filled the byte limit back to its last complete line", async () => {
    const fullLines = "a,b\n1,2\n";
    const partialLine = "3,".padEnd(
      COLUMN_TYPE_SAMPLE_MAX_BYTES - fullLines.length,
      "9",
    );

    const sample = await acquireOpenDataColumnTypeSample({
      entry: _entry(),
      http: _ckanHttp(),
      readByteRange: _readByteRange(fullLines + partialLine),
    });

    expect(sample.csvText).toBe(fullLines);
  });

  it("refuses a CKAN resource that is not a CSV", async () => {
    await expect(
      acquireOpenDataColumnTypeSample({
        entry: _entry({ apiResourceFormat: "PARQUET" }),
        http: _ckanHttp("PARQUET"),
        readByteRange: _readByteRange(""),
      }),
    ).rejects.toSatisfy((caught: unknown) => {
      return (
        OpenDataAcquisitionFailed.is(caught) &&
        caught.failure.code === "resource-format-unsupported"
      );
    });
  });

  it("reads the first rows of a Socrata dataset's CSV export", async () => {
    const http: OpenDataHttp = {
      get: vi.fn(),
      getBytes: vi.fn(async () => {
        return new TextEncoder().encode(
          '"borough","count"\nBronx,3\n',
        ) as Uint8Array<ArrayBuffer>;
      }),
    };

    const sample = await acquireOpenDataColumnTypeSample({
      entry: _entry({
        apiService: "socrata",
        apiBaseUrl: "https://data.cityofnewyork.us",
        externalDatasetId: "erm2-nwe9",
        apiResourceId: "erm2-nwe9",
      }),
      http,
      readByteRange: _readByteRange(""),
    });

    expect(sample.headerNames).toEqual(["borough", "count"]);
    expect(http.getBytes).toHaveBeenCalledWith(
      `https://data.cityofnewyork.us/resource/erm2-nwe9.csv?%24limit=${COLUMN_TYPE_SAMPLE_MAX_ROWS}`,
    );
  });

  it("refuses a pipeline Parquet listing", async () => {
    await expect(
      acquireOpenDataColumnTypeSample({
        entry: _entry({
          accessKind: "pipeline_parquet",
          apiService: undefined,
          apiBaseUrl: undefined,
          apiResourceId: undefined,
          apiResourceFormat: undefined,
          parquetFileName: "WDICSV.parquet",
        }),
        http: _ckanHttp(),
        readByteRange: _readByteRange(""),
      }),
    ).rejects.toSatisfy((caught: unknown) => {
      return (
        OpenDataAcquisitionFailed.is(caught) &&
        caught.failure.code === "access-shape-invalid"
      );
    });
  });
});
