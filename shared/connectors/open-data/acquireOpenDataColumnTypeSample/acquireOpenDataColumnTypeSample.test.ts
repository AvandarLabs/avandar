import { describe, expect, it, vi } from "vitest";
import {
  acquireOpenDataColumnTypeSample,
  COLUMN_TYPE_SAMPLE_MAX_BYTES,
  COLUMN_TYPE_SAMPLE_MAX_ROWS,
} from "$/connectors/open-data/acquireOpenDataColumnTypeSample/acquireOpenDataColumnTypeSample.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { HttpClientError } from "$/utils/HttpClientFactory/HttpClientError.ts";
import type { ReadByteRange } from "$/connectors/open-data/acquireOpenDataColumnTypeSample/acquireOpenDataColumnTypeSample.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { OpenDataAcquisitionFailureCode } from "$/connectors/open-data/openDataErrors.ts";
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
    organization1Name: "OCHA",
    externalServiceName: undefined,
    externalDatasetId: "hdx-hapi-operational-presence",
    sourceUrl: undefined,
    isWorkspaceLoadable: true,
    sourceAssetType: undefined,
    sourceDownloadUrl: undefined,
    organization2Name: undefined,
    organization3Name: undefined,
    organization4Name: undefined,
    domains: undefined,
    tags: undefined,
    additionalSourceMetadata: undefined,
    driveId: undefined,
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
    parquetCacheStatus: undefined,
    parquetCacheBuildId: undefined,
    parquetCacheBuildStartedAt: undefined,
    parquetCacheFailureCode: undefined,
    parquetCacheFolderPath: undefined,
    parquetCachePartCount: undefined,
    parquetCacheSourceVersion: undefined,
    parquetCacheBuiltAt: undefined,
    parquetCacheRowCount: undefined,
    parquetCacheByteSize: undefined,
    parquetCacheCheckedAt: undefined,
    parquetCacheCheckedSourceVersion: undefined,
    companionListings: [],
    apiFreshnessProbe: undefined,
    pipelineScopeKeys: [],
    dateColumnTypeLastVerified: undefined,
    isInvalid: false,
    invalidDatasetReason: undefined,
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

/** A `ReadByteRange` that fails the way a file host does. */
function _failingByteRange(error: Error): ReadByteRange {
  return vi.fn(async () => {
    throw error;
  });
}

/** An HttpClient whose `package_show` request fails. */
function _failingCkanHttp(error: Error): OpenDataHttp {
  return {
    get: vi.fn(async () => {
      throw error;
    }),
    getBytes: vi.fn(),
  };
}

function _statusError(status: number): HttpClientError {
  return new HttpClientError({ kind: "status", method: "GET", status });
}

const NETWORK_ERROR = new HttpClientError({ kind: "network", method: "GET" });

const GHO_BASE_URL = "https://ghoapi.azureedge.net/api";

function _odataEntry(apiResourceId = "WHS3_62"): DataCatalogListing.T {
  return _entry({
    apiService: "odata",
    apiBaseUrl: GHO_BASE_URL,
    externalDatasetId: "gho",
    apiResourceId,
    apiResourceFormat: "ODATA",
  });
}

/** An HttpClient that answers an OData request with this JSON body. */
function _odataHttp(body: unknown): OpenDataHttp {
  return {
    get: vi.fn(async () => {
      return body;
    }),
    getBytes: vi.fn(),
  };
}

/** The failure code a sample attempt rejected with. */
async function _readFailureCode(
  attempt: Promise<unknown>,
): Promise<OpenDataAcquisitionFailureCode | undefined> {
  const caught = await attempt.then(
    () => {
      return undefined;
    },
    (error: unknown) => {
      return error;
    },
  );
  return OpenDataAcquisitionFailed.is(caught) ? caught.failure.code : undefined;
}

describe("acquireOpenDataColumnTypeSample", () => {
  it("reads the start of a CKAN CSV as raw bytes, however large the file", async () => {
    const readByteRange = _readByteRange('"adm1","value"\nKenya,1\n');

    const sample = await acquireOpenDataColumnTypeSample({
      entry: _entry(),
      http: _ckanHttp(),
      readByteRange,
    });

    expect(new TextDecoder().decode(sample.bytes)).toBe(
      '"adm1","value"\nKenya,1\n',
    );
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

    expect(new TextDecoder().decode(sample.bytes)).toBe(fullLines);
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

    expect(new TextDecoder().decode(sample.bytes)).toBe(
      '"borough","count"\nBronx,3\n',
    );
    expect(http.getBytes).toHaveBeenCalledWith(
      `https://data.cityofnewyork.us/resource/erm2-nwe9.csv?%24limit=${COLUMN_TYPE_SAMPLE_MAX_ROWS}`,
    );
  });

  it("writes an OData listing's first rows as CSV, with every column any row has", async () => {
    const http = _odataHttp({
      "@odata.context": `${GHO_BASE_URL}/$metadata#WHS3_62`,
      value: [
        { Id: 1, SpatialDim: "KEN", NumericValue: 1.5, Comments: null },
        { Id: 2, SpatialDim: "UGA", Comments: "a, b", Extra: true },
      ],
    });

    const sample = await acquireOpenDataColumnTypeSample({
      entry: _odataEntry(),
      http,
      readByteRange: _readByteRange(""),
    });

    expect(new TextDecoder().decode(sample.bytes)).toBe(
      'Id,SpatialDim,NumericValue,Comments,Extra\n1,KEN,1.5,,\n2,UGA,,"a, b",true\n',
    );
  });

  it.each([
    ["an indicator", "WHS3_62", `${GHO_BASE_URL}/WHS3_62?$top=200`],
    [
      "a dimension's value list",
      "DIMENSION/COUNTRY/DimensionValues",
      `${GHO_BASE_URL}/DIMENSION/COUNTRY/DimensionValues?$top=200`,
    ],
    ["a code with a space", "A B", `${GHO_BASE_URL}/A%20B?$top=200`],
  ])(
    "asks OData for the first 200 rows of %s",
    async (_label, apiResourceId, expectedUrl) => {
      const http = _odataHttp({ value: [{ Code: "KEN" }] });

      await acquireOpenDataColumnTypeSample({
        entry: _odataEntry(apiResourceId),
        http,
        readByteRange: _readByteRange(""),
      });

      expect(http.get).toHaveBeenCalledWith(expectedUrl);
    },
  );

  it("cuts an OData sample that fills the byte limit back to its last whole row", async () => {
    const rowCount = 200;
    const value = Array.from({ length: rowCount }, (_unused, index) => {
      return { Id: index, Text: "x".repeat(30_000) };
    });

    const sample = await acquireOpenDataColumnTypeSample({
      entry: _odataEntry(),
      http: _odataHttp({ value }),
      readByteRange: _readByteRange(""),
    });

    const text = new TextDecoder().decode(sample.bytes);
    const lines = text.split("\n").slice(0, -1);
    expect(sample.bytes.byteLength).toBeLessThanOrEqual(
      COLUMN_TYPE_SAMPLE_MAX_BYTES,
    );
    expect(text.endsWith("\n")).toBe(true);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.length).toBeLessThan(rowCount + 1);
    expect(lines.at(-1)).toBe(`${lines.length - 2},${"x".repeat(30_000)}`);
  });

  it.each([
    ["a request that fails", "odata-unreachable", NETWORK_ERROR],
    ["a body with no value array", "odata-response-invalid", { error: "x" }],
    [
      "a value array that holds no row objects",
      "odata-response-invalid",
      { value: [1, 2] },
    ],
    ["no rows", "odata-empty", { value: [] }],
  ])(
    "reports an OData listing with %s as %s",
    async (_label, expectedCode, answer) => {
      const http: OpenDataHttp = {
        get: vi.fn(async () => {
          if (answer instanceof Error) {
            throw answer;
          }
          return answer;
        }),
        getBytes: vi.fn(),
      };

      const code = await _readFailureCode(
        acquireOpenDataColumnTypeSample({
          entry: _odataEntry(),
          http,
          readByteRange: _readByteRange(""),
        }),
      );

      expect(code).toBe(expectedCode);
    },
  );

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

  it.each([
    ["an empty body", ""],
    ["only whitespace", " \r\n\n"],
  ])("reports a CKAN file with %s as empty", async (_label, text) => {
    const code = await _readFailureCode(
      acquireOpenDataColumnTypeSample({
        entry: _entry(),
        http: _ckanHttp(),
        readByteRange: _readByteRange(text),
      }),
    );

    expect(code).toBe("resource-empty");
  });

  it.each([
    [416, "resource-empty"],
    [404, "resource-not-found"],
    [410, "resource-not-found"],
    [401, "resource-authorization-required"],
    [403, "resource-authorization-required"],
    [503, "resource-unreachable"],
  ])(
    "maps a CKAN file read that fails with HTTP %i to %s",
    async (status, expectedCode) => {
      const code = await _readFailureCode(
        acquireOpenDataColumnTypeSample({
          entry: _entry(),
          http: _ckanHttp(),
          readByteRange: _failingByteRange(_statusError(status)),
        }),
      );

      expect(code).toBe(expectedCode);
    },
  );

  it("reports a CKAN file host that never answers as unreachable", async () => {
    const code = await _readFailureCode(
      acquireOpenDataColumnTypeSample({
        entry: _entry(),
        http: _ckanHttp(),
        readByteRange: _failingByteRange(NETWORK_ERROR),
      }),
    );

    expect(code).toBe("resource-unreachable");
  });

  it.each([
    [404, "resource-not-found"],
    [403, "ckan-authorization-required"],
    [503, "ckan-unreachable"],
  ])(
    "maps a CKAN package_show that fails with HTTP %i to %s",
    async (status, expectedCode) => {
      const code = await _readFailureCode(
        acquireOpenDataColumnTypeSample({
          entry: _entry(),
          http: _failingCkanHttp(_statusError(status)),
          readByteRange: _readByteRange("a\n1\n"),
        }),
      );

      expect(code).toBe(expectedCode);
    },
  );

  it("reports a CKAN API that never answers as the API being unreachable, not the file", async () => {
    const code = await _readFailureCode(
      acquireOpenDataColumnTypeSample({
        entry: _entry(),
        http: _failingCkanHttp(NETWORK_ERROR),
        readByteRange: _readByteRange("a\n1\n"),
      }),
    );

    expect(code).toBe("ckan-unreachable");
  });
});
