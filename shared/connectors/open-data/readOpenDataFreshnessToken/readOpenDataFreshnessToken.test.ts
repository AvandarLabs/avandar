import { describe, expect, it, vi } from "vitest";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { readOpenDataFreshnessToken } from "$/connectors/open-data/readOpenDataFreshnessToken/readOpenDataFreshnessToken.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { OpenDataAcquisitionFailureCode } from "$/connectors/open-data/openDataErrors.ts";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";

const BASE_URL = "https://data.humdata.org";
const DATASET_ID = "hdx-hapi-operational-presence";
const RESOURCE_ID = "e3a18c4c-ec1b-457e-9f60-cee283c04e0c";
const CONTENT_HASH = "32e316c0337f8a9b9117999a595f8e86";
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
    pipelineName: undefined,
    pipelineRunId: undefined,
    externalOrganizationName: "OCHA",
    externalServiceName: undefined,
    externalDatasetId: DATASET_ID,
    sourceUrl: undefined,
    canonicalUrls: undefined,
    license: undefined,
    updateFrequency: undefined,
    description: undefined,
    notes: undefined,
    metadata: undefined,
    accessKind: "api_resource",
    apiService: "ckan",
    apiBaseUrl: BASE_URL,
    apiResourceId: RESOURCE_ID,
    apiResourceFormat: "CSV",
    cachedObjectPath: undefined,
    cachedSourceVersion: undefined,
    cachedAt: undefined,
    ...overrides,
  };
}

function _resource(overrides: Record<string, unknown> = {}) {
  return {
    id: RESOURCE_ID,
    name: "op.csv",
    format: "CSV",
    url: `${BASE_URL}/dataset/5b89fc55/resource/e3a18c4c/download/op.csv`,
    url_type: "upload",
    size: 235,
    hash: CONTENT_HASH,
    last_modified: "2026-08-18T08:44:07.360475",
    metadata_modified: "2026-08-18T08:44:07.360475",
    mimetype: null,
    datastore_active: false,
    ...overrides,
  };
}

function _ckanHttp(
  options: { resources?: readonly unknown[] } = {},
): OpenDataHttp {
  return {
    getJson: vi.fn(async () => {
      return {
        success: true,
        result: {
          id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
          name: DATASET_ID,
          metadata_modified: "2026-08-18T08:44:07.360475",
          resources: options.resources ?? [_resource()],
        },
      };
    }),
    getBytes: vi.fn(async () => {
      throw new Error("readOpenDataFreshnessToken must never read bytes");
    }),
  };
}

const SOCRATA_BASE_URL = "https://data.cityofnewyork.us";
const SOCRATA_DATASET_ID = "erm2-nwe9";

function _socrataEntry(
  overrides: Partial<DataCatalogListing.T> = {},
): DataCatalogListing.T {
  return _entry({
    apiService: "socrata",
    apiBaseUrl: SOCRATA_BASE_URL,
    externalDatasetId: SOCRATA_DATASET_ID,
    apiResourceId: SOCRATA_DATASET_ID,
    apiResourceFormat: "CSV",
    ...overrides,
  });
}

function _socrataHttp(options: { rowsUpdatedAt?: number } = {}): OpenDataHttp {
  return {
    getJson: vi.fn(async () => {
      return {
        id: SOCRATA_DATASET_ID,
        name: "311",
        rowsUpdatedAt: options.rowsUpdatedAt ?? 1792114673,
      };
    }),
    getBytes: vi.fn(async () => {
      throw new Error("readOpenDataFreshnessToken must never fetch rows");
    }),
    getRows: vi.fn(async () => {
      throw new Error("readOpenDataFreshnessToken must never call getRows");
    }),
  } as unknown as OpenDataHttp;
}

async function _failureCode(
  run: () => Promise<unknown>,
): Promise<OpenDataAcquisitionFailureCode> {
  try {
    await run();
  } catch (caught) {
    if (OpenDataAcquisitionFailed.is(caught)) {
      return caught.failure.code;
    }
    throw caught;
  }
  throw new Error("expected the read to be refused, but it succeeded");
}

describe("readOpenDataFreshnessToken", () => {
  it("reads a CKAN resource's hash-based token without fetching bytes", async () => {
    const http = _ckanHttp();

    const token = await readOpenDataFreshnessToken({ entry: _entry(), http });

    expect(token).toBe(`ckan:hash:${CONTENT_HASH}`);
    expect(http.getBytes).not.toHaveBeenCalled();
  });

  it("refuses a CKAN entry whose resource is no longer listed in its dataset", async () => {
    const http = _ckanHttp({
      resources: [
        _resource({ id: "a-different-resource-id", hash: "other-hash" }),
      ],
    });

    expect(
      await _failureCode(() => {
        return readOpenDataFreshnessToken({ entry: _entry(), http });
      }),
    ).toBe("access-shape-invalid");
  });

  it("reads a Socrata view's token without fetching rows", async () => {
    const http = _socrataHttp();

    const token = await readOpenDataFreshnessToken({
      entry: _socrataEntry(),
      http,
    });

    expect(token).toBe("socrata:rowsUpdatedAt:1792114673");
    expect(http.getBytes).not.toHaveBeenCalled();
  });

  it("refuses an entry that satisfies neither access shape", async () => {
    const http = _ckanHttp();

    expect(
      await _failureCode(() => {
        return readOpenDataFreshnessToken({
          entry: _entry({ apiResourceId: undefined }),
          http,
        });
      }),
    ).toBe("access-shape-invalid");
  });
});
