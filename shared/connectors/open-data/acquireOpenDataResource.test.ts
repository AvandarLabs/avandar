import { describe, expect, it, vi } from "vitest";
import { acquireOpenDataResource } from "$/connectors/open-data/acquireOpenDataResource.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";
import type { OpenDataAcquisitionFailureCode } from "$/connectors/open-data/openDataErrors.ts";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";

const BASE_URL = "https://data.humdata.org";
const DATASET_ID = "hdx-hapi-operational-presence";
const RESOURCE_ID = "e3a18c4c-ec1b-457e-9f60-cee283c04e0c";
const CONTENT_HASH = "32e316c0337f8a9b9117999a595f8e86";
const RESOURCE_URL = `${BASE_URL}/dataset/5b89fc55/resource/e3a18c4c/download/op.csv`;
const CSV_BYTES = new Uint8Array([99, 111, 100, 101, 10]);
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
    pipelineScopeKeys: [],
    ...overrides,
  };
}

function _resource(overrides: Record<string, unknown> = {}) {
  return {
    id: RESOURCE_ID,
    name: "op.csv",
    format: "CSV",
    url: RESOURCE_URL,
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

function _http(
  options: {
    resources?: readonly unknown[];
    bytes?: Uint8Array<ArrayBuffer>;
  } = {},
): OpenDataHttp {
  return {
    get: vi.fn(async () => {
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
      return options.bytes ?? CSV_BYTES;
    }),
  };
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
  throw new Error("expected the acquisition to be refused, but it succeeded");
}

describe("acquireOpenDataResource", () => {
  it("returns the resource's bytes, its content kind and its version token", async () => {
    const acquisition = await acquireOpenDataResource({
      entry: _entry(),
      http: _http(),
    });

    expect(acquisition.contentKind).toBe("csv");
    expect(Array.from(acquisition.bytes)).toEqual(Array.from(CSV_BYTES));
    expect(acquisition.sourceVersion).toBe(`ckan:hash:${CONTENT_HASH}`);
  });

  it("reads the resource's own URL for the bytes", async () => {
    const http = _http();

    await acquireOpenDataResource({ entry: _entry(), http });

    expect(http.getBytes).toHaveBeenCalledWith(RESOURCE_URL);
  });

  it("reports parquet as its own content kind, needing no transcode", async () => {
    const acquisition = await acquireOpenDataResource({
      entry: _entry({ apiResourceFormat: "Parquet" }),
      http: _http({ resources: [_resource({ format: "Parquet" })] }),
    });

    expect(acquisition.contentKind).toBe("parquet");
  });

  // Discovery costs no extra call: the same response that names the download
  // URL also carries the format, the size, the token and the datastore flag.
  it("issues exactly one metadata call", async () => {
    const http = _http();

    await acquireOpenDataResource({ entry: _entry(), http });

    expect(http.get).toHaveBeenCalledTimes(1);
  });

  // A populated query endpoint is reported and not acted on, because reaching
  // CKAN's datastore needs a credential this code does not hold.
  it("reports a populated datastore and still reads the file", async () => {
    const http = _http({ resources: [_resource({ datastore_active: true })] });

    const acquisition = await acquireOpenDataResource({
      entry: _entry(),
      http,
    });

    expect(acquisition.datastoreActive).toBe(true);
    expect(http.getBytes).toHaveBeenCalledWith(RESOURCE_URL);
  });

  it("reports an unpopulated datastore as false", async () => {
    const acquisition = await acquireOpenDataResource({
      entry: _entry(),
      http: _http(),
    });

    expect(acquisition.datastoreActive).toBe(false);
  });

  it("selects the named resource from a dataset whose first resource is a readme", async () => {
    const acquisition = await acquireOpenDataResource({
      entry: _entry(),
      http: _http({
        resources: [
          _resource({
            id: "435ed157-6f7a-4e8f-a63a-2aa177b9bd05",
            format: "TXT",
            name: "How To Understand This Data.txt",
          }),
          _resource(),
        ],
      }),
    });

    expect(acquisition.contentKind).toBe("csv");
    expect(acquisition.sourceVersion).toBe(`ckan:hash:${CONTENT_HASH}`);
  });

  it("returns no version token when the source reports neither hash nor mtime", async () => {
    const acquisition = await acquireOpenDataResource({
      entry: _entry(),
      http: _http({
        resources: [_resource({ hash: "", last_modified: null })],
      }),
    });

    expect(acquisition.sourceVersion).toBeUndefined();
  });

  it("refuses a pipeline entry rather than taking its Parquet path", async () => {
    expect(
      await _failureCode(() => {
        return acquireOpenDataResource({
          entry: _entry({
            accessKind: "pipeline_parquet",
            apiService: undefined,
            apiBaseUrl: undefined,
            apiResourceId: undefined,
            apiResourceFormat: undefined,
            parquetFileName: "series.parquet",
            pipelineName: "world-bank__wdi",
            pipelineRunId: "run-1",
          }),
          http: _http(),
        });
      }),
    ).toBe("access-shape-invalid");
  });

  it("refuses an entry that satisfies neither access shape", async () => {
    expect(
      await _failureCode(() => {
        return acquireOpenDataResource({
          entry: _entry({ apiResourceId: undefined }),
          http: _http(),
        });
      }),
    ).toBe("access-shape-invalid");
  });

  describe("the size ceiling", () => {
    // Paired with the positive control below so the `not.toHaveBeenCalled`
    // cannot pass because the whole call threw for some earlier reason.
    it("refuses an oversized resource without reading any bytes", async () => {
      const http = _http({ resources: [_resource({ size: 2_000_000 })] });

      expect(
        await _failureCode(() => {
          return acquireOpenDataResource({
            entry: _entry(),
            http,
            maxBytes: 1_000_000,
          });
        }),
      ).toBe("resource-too-large");
      expect(http.getBytes).not.toHaveBeenCalled();
    });

    it("reads the bytes when the resource is within the ceiling", async () => {
      const http = _http({ resources: [_resource({ size: 999_999 })] });

      await acquireOpenDataResource({
        entry: _entry(),
        http,
        maxBytes: 1_000_000,
      });

      expect(http.getBytes).toHaveBeenCalledTimes(1);
    });
  });

  it("surfaces a CKAN authorization refusal as its own condition", async () => {
    const http: OpenDataHttp = {
      get: vi.fn(async () => {
        return {
          success: false,
          error: {
            __type: "Authorization Error",
            message:
              "Access denied: Action package_show requires an authenticated user",
          },
        };
      }),
      getBytes: vi.fn(async () => {
        return CSV_BYTES;
      }),
    };

    expect(
      await _failureCode(() => {
        return acquireOpenDataResource({ entry: _entry(), http });
      }),
    ).toBe("ckan-authorization-required");
    expect(http.getBytes).not.toHaveBeenCalled();
  });
});

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

function _socrataHttp(
  options: {
    rowCount?: string;
    csv?: string;
    rowsUpdatedAt?: number;
  } = {},
): OpenDataHttp {
  return {
    get: vi.fn(async (url: string) => {
      if (url.includes("/api/views/")) {
        return {
          id: SOCRATA_DATASET_ID,
          name: "311",
          rowsUpdatedAt: options.rowsUpdatedAt ?? 1792114673,
        };
      }
      return [{ count: options.rowCount ?? "100" }];
    }),
    getBytes: vi.fn(async () => {
      return new TextEncoder().encode(
        options.csv ?? "a,b\n1,2\n",
      ) as Uint8Array<ArrayBuffer>;
    }),
  };
}

describe("acquireOpenDataResource, api_service: socrata", () => {
  it("dispatches to SocrataClient and returns CSV content", async () => {
    const http = _socrataHttp();

    const acquisition = await acquireOpenDataResource({
      entry: _socrataEntry(),
      http,
    });

    expect(acquisition.contentKind).toBe("csv");
    expect(new TextDecoder().decode(acquisition.bytes)).toBe("a,b\n1,2\n");
    expect(acquisition.sourceVersion).toBe("socrata:rowsUpdatedAt:1792114673");
  });

  it("refuses a Socrata dataset over the row ceiling before fetching", async () => {
    const http = _socrataHttp({ rowCount: "22811427" });

    expect(
      await _failureCode(() => {
        return acquireOpenDataResource({
          entry: _socrataEntry(),
          http,
          maxRows: 1_000_000,
        });
      }),
    ).toBe("socrata-too-large");
    expect(http.getBytes).not.toHaveBeenCalled();
  });
});
