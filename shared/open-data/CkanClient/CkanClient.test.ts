import { createCkanClient } from "$/open-data/CkanClient/CkanClient.ts";
import { OpenDataAcquisitionFailed } from "$/open-data/openDataErrors.ts";
import { describe, expect, it, vi } from "vitest";
import type { OpenDataHttp } from "$/open-data/CkanClient/CkanClient.types.ts";

const BASE_URL = "https://data.humdata.org";
const DATASET_ID = "movement-range-maps";

/**
 * The resource shape `package_show` really returns, taken from HDX. Kept whole
 * rather than trimmed to the fields under test, so a schema that starts
 * requiring another field fails here rather than in production.
 */
const README_RESOURCE = {
  id: "435ed157-6f7a-4e8f-a63a-2aa177b9bd05",
  name: "How To Understand This Data.txt",
  format: "TXT",
  url: `${BASE_URL}/dataset/c3429f0e/resource/435ed157/download/readme.txt`,
  url_type: "upload",
  size: 961,
  hash: "",
  last_modified: "2022-05-24T04:02:33.007599",
  metadata_modified: "2024-09-26T15:11:05.801326",
  mimetype: "text/plain",
  datastore_active: false,
};

const CSV_RESOURCE = {
  id: "9da55974-adf5-4106-988c-d3c92333ea0a",
  name: "fts_requirements_funding_covid_mwi.csv",
  format: "CSV",
  url: `${BASE_URL}/dataset/f973ecd3/resource/9da55974/download/fts.csv`,
  url_type: "upload",
  size: 235,
  hash: "32e316c0337f8a9b9117999a595f8e86",
  last_modified: "2026-08-18T08:44:07.360475",
  metadata_modified: "2026-08-18T08:44:07.360475",
  mimetype: null,
  datastore_active: false,
};

function _packageResponse(resources: readonly unknown[] = [README_RESOURCE]) {
  return {
    success: true,
    result: {
      id: "c3429f0e-651b-4788-bb2f-4adbf222c90e",
      name: DATASET_ID,
      metadata_modified: "2025-11-19T10:29:46.280529",
      resources,
    },
  };
}

function _http(overrides: Partial<OpenDataHttp> = {}): OpenDataHttp {
  return {
    getJson: vi.fn(async () => {
      return _packageResponse();
    }),
    getBytes: vi.fn(async () => {
      return new Uint8Array([1, 2, 3]);
    }),
    ...overrides,
  };
}

describe("CkanClient.getPackage", () => {
  it("requests the package_show action for the named dataset", async () => {
    const http = _http();

    await createCkanClient(http).getPackage({
      baseUrl: BASE_URL,
      ckanDatasetId: DATASET_ID,
    });

    expect(http.getJson).toHaveBeenCalledWith(
      `${BASE_URL}/api/3/action/package_show?id=${DATASET_ID}`,
    );
  });

  // Space arrives as `+` because a query string is form-encoded, which CKAN
  // decodes back to a space. What matters is that `&` and `=` are escaped, so a
  // dataset id cannot smuggle in a second query parameter.
  it("encodes a dataset id so it cannot inject query parameters", async () => {
    const http = _http();

    await createCkanClient(http).getPackage({
      baseUrl: BASE_URL,
      ckanDatasetId: "a b&rows=999",
    });

    expect(http.getJson).toHaveBeenCalledWith(
      `${BASE_URL}/api/3/action/package_show?id=a+b%26rows%3D999`,
    );
  });

  it("trims a trailing slash off the base URL rather than doubling it", async () => {
    const http = _http();

    await createCkanClient(http).getPackage({
      baseUrl: `${BASE_URL}/`,
      ckanDatasetId: DATASET_ID,
    });

    expect(http.getJson).toHaveBeenCalledWith(
      `${BASE_URL}/api/3/action/package_show?id=${DATASET_ID}`,
    );
  });

  it("returns every resource the dataset lists, in order", async () => {
    const http = _http({
      getJson: vi.fn(async () => {
        return _packageResponse([README_RESOURCE, CSV_RESOURCE]);
      }),
    });

    const ckanPackage = await createCkanClient(http).getPackage({
      baseUrl: BASE_URL,
      ckanDatasetId: DATASET_ID,
    });

    expect(
      ckanPackage.resources.map((resource) => {
        return resource.id;
      }),
    ).toEqual([README_RESOURCE.id, CSV_RESOURCE.id]);
  });

  // A resource whose `mimetype` is absent parses: it is absent on roughly 40%
  // of real HDX resources, so requiring it would reject most of the catalog.
  it("parses a resource with no mimetype", async () => {
    const http = _http({
      getJson: vi.fn(async () => {
        return _packageResponse([CSV_RESOURCE]);
      }),
    });

    const ckanPackage = await createCkanClient(http).getPackage({
      baseUrl: BASE_URL,
      ckanDatasetId: DATASET_ID,
    });

    expect(ckanPackage.resources[0]?.format).toBe("CSV");
  });

  // CKAN reports failures in-band, so reading `result` without checking
  // `success` would hand back undefined where a package was expected.
  it("raises ckan-action-failed on a 200 body with success false", async () => {
    const http = _http({
      getJson: vi.fn(async () => {
        return {
          success: false,
          error: { __type: "Validation Error", message: "Missing value" },
        };
      }),
    });

    await expect(
      createCkanClient(http).getPackage({
        baseUrl: BASE_URL,
        ckanDatasetId: DATASET_ID,
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return (
        OpenDataAcquisitionFailed.is(error, "ckan-action-failed") &&
        error.failure.code === "ckan-action-failed" &&
        error.failure.ckanErrorType === "Validation Error"
      );
    });
  });

  it("raises ckan-authorization-required on an authorization error body", async () => {
    const http = _http({
      getJson: vi.fn(async () => {
        return {
          success: false,
          error: {
            __type: "Authorization Error",
            message:
              "Access denied: Action datastore_search requires an authenticated user",
          },
        };
      }),
    });

    await expect(
      createCkanClient(http).getPackage({
        baseUrl: BASE_URL,
        ckanDatasetId: DATASET_ID,
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return OpenDataAcquisitionFailed.is(error, "ckan-authorization-required");
    });
  });

  it("rejects a package result carrying no resources array", async () => {
    const http = _http({
      getJson: vi.fn(async () => {
        return { success: true, result: { id: "x", name: DATASET_ID } };
      }),
    });

    await expect(
      createCkanClient(http).getPackage({
        baseUrl: BASE_URL,
        ckanDatasetId: DATASET_ID,
      }),
    ).rejects.toThrow();
  });
});

describe("CkanClient.getResourceBytes", () => {
  it("reads the resource's own URL", async () => {
    const http = _http();

    const bytes = await createCkanClient(http).getResourceBytes({
      ckanResourceId: CSV_RESOURCE.id,
      url: CSV_RESOURCE.url,
    });

    expect(http.getBytes).toHaveBeenCalledWith(CSV_RESOURCE.url);
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("raises resource-unreachable when the byte read throws", async () => {
    const http = _http({
      getBytes: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    });

    await expect(
      createCkanClient(http).getResourceBytes({
        ckanResourceId: CSV_RESOURCE.id,
        url: CSV_RESOURCE.url,
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return OpenDataAcquisitionFailed.is(error, "resource-unreachable");
    });
  });

  // The download redirects to a presigned object-store URL, so no error may
  // repeat any URL: the redirect target is a credential.
  it("names no URL in the unreachable failure", async () => {
    const http = _http({
      getBytes: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    });

    const error = await createCkanClient(http)
      .getResourceBytes({
        ckanResourceId: CSV_RESOURCE.id,
        url: CSV_RESOURCE.url,
      })
      .catch((caught: unknown) => {
        return caught;
      });

    expect(OpenDataAcquisitionFailed.is(error)).toBe(true);
    const failure = (error as OpenDataAcquisitionFailed).failure;
    expect(JSON.stringify(failure)).not.toContain("https://");
    expect((error as OpenDataAcquisitionFailed).message).not.toContain(
      "https://",
    );
  });
});
