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

/** An HttpClient whose Socrata CSV export answers with `csvText`. */
function _socrataHttp(csvText: string): OpenDataHttp {
  return {
    get: vi.fn(),
    getBytes: vi.fn(async () => {
      return new TextEncoder().encode(csvText) as Uint8Array<ArrayBuffer>;
    }),
  };
}

const SOCRATA_ENTRY_OVERRIDES: Partial<DataCatalogListing.T> = {
  apiService: "socrata",
  apiBaseUrl: "https://data.cityofnewyork.us",
  externalDatasetId: "gthc-hcne",
  apiResourceId: "gthc-hcne",
};

/** A CSV with a header and `numRows` one-column rows. */
function _csvWithRows(numRows: number): string {
  return (
    [
      "id",
      ...Array.from({ length: numRows }, (_, index) => {
        return String(index);
      }),
    ].join("\n") + "\n"
  );
}

describe("acquireOpenDataColumnTypeSample completeness", () => {
  it("calls a CKAN file shorter than the byte limit complete", async () => {
    const sample = await acquireOpenDataColumnTypeSample({
      entry: _entry(),
      http: _ckanHttp(),
      readByteRange: _readByteRange("a,b\n1,2\n"),
    });

    expect(sample.isComplete).toBe(true);
  });

  it("calls a CKAN sample that filled the byte limit incomplete", async () => {
    const sample = await acquireOpenDataColumnTypeSample({
      entry: _entry(),
      http: _ckanHttp(),
      readByteRange: _readByteRange(
        "a,b\n".padEnd(COLUMN_TYPE_SAMPLE_MAX_BYTES, "9"),
      ),
    });

    expect(sample.isComplete).toBe(false);
  });

  it("calls a Socrata export with fewer rows than the row limit complete", async () => {
    const sample = await acquireOpenDataColumnTypeSample({
      entry: _entry(SOCRATA_ENTRY_OVERRIDES),
      http: _socrataHttp(_csvWithRows(5)),
      readByteRange: _readByteRange(""),
    });

    expect(sample.isComplete).toBe(true);
  });

  it("calls a Socrata export that reached the row limit incomplete", async () => {
    const sample = await acquireOpenDataColumnTypeSample({
      entry: _entry(SOCRATA_ENTRY_OVERRIDES),
      http: _socrataHttp(_csvWithRows(COLUMN_TYPE_SAMPLE_MAX_ROWS)),
      readByteRange: _readByteRange(""),
    });

    expect(sample.isComplete).toBe(false);
  });

  it("does not count line breaks inside quoted values as rows", async () => {
    const quotedRow = `"${"line\n".repeat(COLUMN_TYPE_SAMPLE_MAX_ROWS)}"`;

    const sample = await acquireOpenDataColumnTypeSample({
      entry: _entry(SOCRATA_ENTRY_OVERRIDES),
      http: _socrataHttp(`the_geom\n${quotedRow}\n`),
      readByteRange: _readByteRange(""),
    });

    expect(sample.isComplete).toBe(true);
  });
});
