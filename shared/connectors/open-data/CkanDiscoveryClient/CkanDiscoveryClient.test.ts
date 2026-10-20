import { describe, expect, it, vi } from "vitest";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import { parseCkanTimestamp } from "$/connectors/open-data/parseCkanTimestamp/parseCkanTimestamp.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

const BASE_URL = "https://data.humdata.org";

function _http(overrides: Partial<OpenDataHttp> = {}): OpenDataHttp {
  return {
    get: vi.fn(async () => {
      return {
        success: true,
        result: ["movement-range-maps", "hdx-hapi-operational-presence"],
      };
    }),
    getBytes: vi.fn(),
    ...overrides,
  };
}

describe("CkanDiscoveryClient.listDatasets", () => {
  it("requests the package_list action for the given deployment", async () => {
    const http = _http();

    await createCkanDiscoveryClient(http).listDatasets({ baseUrl: BASE_URL });

    expect(http.get).toHaveBeenCalledWith(
      `${BASE_URL}/api/3/action/package_list?`,
    );
  });

  it("returns every dataset slug", async () => {
    const http = _http();

    const slugs = await createCkanDiscoveryClient(http).listDatasets({
      baseUrl: BASE_URL,
    });

    expect(slugs).toEqual([
      "movement-range-maps",
      "hdx-hapi-operational-presence",
    ]);
  });

  it("raises ckan-action-failed when the action reports failure", async () => {
    const http = _http({
      get: vi.fn(async () => {
        return {
          success: false,
          error: { __type: "Some Error", message: "boom" },
        };
      }),
    });

    await expect(
      createCkanDiscoveryClient(http).listDatasets({ baseUrl: BASE_URL }),
    ).rejects.toSatisfy((error: unknown) => {
      return OpenDataAcquisitionFailed.is(error, "ckan-action-failed");
    });
  });
});

function _searchHttp(results: unknown[] = []): OpenDataHttp {
  return {
    get: vi.fn(async () => {
      return { success: true, result: { count: results.length, results } };
    }),
    getBytes: vi.fn(),
  };
}

function _sentQuery(http: OpenDataHttp): URLSearchParams {
  return new URL(String(vi.mocked(http.get).mock.calls[0]?.[0])).searchParams;
}

describe("CkanDiscoveryClient.searchDatasets", () => {
  it("sorts by metadata_modified then name, 1000 rows at a time", async () => {
    const http = _searchHttp();

    await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 1000,
    });

    expect([_sentQuery(http).get("sort"), _sentQuery(http).get("rows")]).toEqual(
      ["metadata_modified asc,name asc", "1000"],
    );
  });

  it("filters to a window, with * for a missing bound", async () => {
    const http = _searchHttp();

    await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 1000,
      modifiedSince: new Date("2026-10-01T00:00:00.000Z"),
    });

    expect(_sentQuery(http).get("fq")).toBe(
      "metadata_modified:[2026-10-01T00:00:00.000Z TO *]",
    );
  });

  it("makes the upper bound exclusive", async () => {
    const http = _searchHttp();

    await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 1000,
      modifiedSince: new Date("2026-10-01T00:00:00.000Z"),
      modifiedBefore: new Date("2026-10-15T00:00:00.000Z"),
    });

    expect(_sentQuery(http).get("fq")).toBe(
      "metadata_modified:[2026-10-01T00:00:00.000Z TO 2026-10-15T00:00:00.000Z}",
    );
  });

  it("filters strictly after a cursor on both metadata_modified and name", async () => {
    const http = _searchHttp();

    await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 1000,
      after: {
        modifiedAt: parseCkanTimestamp("2026-10-20T13:47:48.858245"),
        name: "movement-range-maps",
      },
    });

    expect(_sentQuery(http).get("fq")).toBe(
      '(metadata_modified:{2026-10-20T13:47:48.858Z TO *] OR ' +
        '(metadata_modified:"2026-10-20T13:47:48.858Z" AND name:{"movement-range-maps" TO *]))',
    );
  });

  it("returns full datasets, resources included", async () => {
    const http = _searchHttp([
      {
        id: "c3429f0e",
        name: "movement-range-maps",
        metadata_modified: "2026-10-20T13:47:48.858245",
        resources: [
          {
            id: "csv-1",
            name: "data.csv",
            format: "CSV",
            url: "https://data.humdata.org/x.csv",
          },
        ],
      },
    ]);

    const [dataset] = await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 1000,
    });

    expect([
      dataset?.name,
      dataset?.resources[0]?.id,
      dataset?.resources[0]?.url_type,
    ]).toEqual(["movement-range-maps", "csv-1", "upload"]);
  });

  it("raises ckan-action-failed when the action reports failure", async () => {
    const http = _http({
      get: vi.fn(async () => {
        return {
          success: false,
          error: { __type: "Some Error", message: "boom" },
        };
      }),
    });

    await expect(
      createCkanDiscoveryClient(http).searchDatasets({
        baseUrl: BASE_URL,
        rows: 1000,
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return OpenDataAcquisitionFailed.is(error, "ckan-action-failed");
    });
  });
});
