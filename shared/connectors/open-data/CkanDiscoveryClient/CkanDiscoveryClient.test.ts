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

function _wireDataset(overrides: Record<string, unknown> = {}): unknown {
  return {
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
    ...overrides,
  };
}

/** A valid dataset followed by one whose only resource has a null format. */
function _pageEndingInAnInvalidDataset(): OpenDataHttp {
  return _searchHttp([
    _wireDataset({ name: "a-valid" }),
    _wireDataset({
      name: "z-invalid",
      metadata_modified: "2026-10-20T14:00:00.123456",
      resources: [
        { id: "r", name: "r", format: null, url: "https://x.test/r.csv" },
      ],
    }),
  ]);
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

  it("matches every dataset and asks for no facets", async () => {
    const http = _searchHttp();

    await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 1000,
    });

    expect([_sentQuery(http).get("q"), _sentQuery(http).get("facet")]).toEqual(
      ["*:*", "false"],
    );
  });

  it("requires a window, with * for a missing bound", async () => {
    const http = _searchHttp();

    await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 1000,
      modifiedSince: new Date("2026-10-01T00:00:00.000Z"),
    });

    expect(_sentQuery(http).get("fq")).toBe(
      "+metadata_modified:[2026-10-01T00:00:00.000Z TO *]",
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
      "+metadata_modified:[2026-10-01T00:00:00.000Z TO 2026-10-15T00:00:00.000Z}",
    );
  });

  it("requires a match strictly after a cursor on both metadata_modified and name", async () => {
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
      '+(metadata_modified:{2026-10-20T13:47:48.858Z TO *] OR ' +
        '(metadata_modified:"2026-10-20T13:47:48.858Z" AND name:{"movement-range-maps" TO *]))',
    );
  });

  it("keeps the exclusive upper bound after a cursor", async () => {
    const http = _searchHttp();

    await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 1000,
      modifiedBefore: new Date("2026-10-21T00:00:00.000Z"),
      after: {
        modifiedAt: parseCkanTimestamp("2026-10-20T13:47:48.858245"),
        name: "movement-range-maps",
      },
    });

    expect(_sentQuery(http).get("fq")).toBe(
      '+(metadata_modified:{2026-10-20T13:47:48.858Z TO 2026-10-21T00:00:00.000Z} OR ' +
        '(metadata_modified:"2026-10-20T13:47:48.858Z" AND name:{"movement-range-maps" TO *]))',
    );
  });

  it("escapes a backslash and a double quote in the cursor name", async () => {
    const http = _searchHttp();

    await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 1000,
      after: {
        modifiedAt: new Date("2026-10-20T13:47:48.858Z"),
        name: 'a"b\\c',
      },
    });

    expect(_sentQuery(http).get("fq")).toContain('name:{"a\\"b\\\\c" TO *]');
  });

  it("returns full datasets, resources included", async () => {
    const http = _searchHttp([_wireDataset()]);

    const {
      datasets: [dataset],
    } = await createCkanDiscoveryClient(http).searchDatasets({
      baseUrl: BASE_URL,
      rows: 1000,
    });

    expect([
      dataset?.name,
      dataset?.resources[0]?.id,
      dataset?.resources[0]?.url_type,
    ]).toEqual(["movement-range-maps", "csv-1", "upload"]);
  });

  it("returns the valid datasets and lists an invalid one as skipped", async () => {
    const page = await createCkanDiscoveryClient(
      _pageEndingInAnInvalidDataset(),
    ).searchDatasets({ baseUrl: BASE_URL, rows: 1000 });

    expect({
      datasets: page.datasets.map((dataset) => {
        return dataset.name;
      }),
      skippedDatasets: page.skippedDatasets.map((skipped) => {
        return [skipped.name, skipped.metadataModified];
      }),
    }).toEqual({
      datasets: ["a-valid"],
      skippedDatasets: [["z-invalid", "2026-10-20T14:00:00.123456"]],
    });
  });

  it("says which field made a dataset invalid", async () => {
    const { skippedDatasets } = await createCkanDiscoveryClient(
      _pageEndingInAnInvalidDataset(),
    ).searchDatasets({ baseUrl: BASE_URL, rows: 1000 });

    expect(skippedDatasets[0]?.reason).toContain("resources.0.format");
  });

  it("ends the cursor at the last raw result even when it was skipped", async () => {
    const { nextCursor } = await createCkanDiscoveryClient(
      _pageEndingInAnInvalidDataset(),
    ).searchDatasets({ baseUrl: BASE_URL, rows: 1000 });

    expect([nextCursor?.modifiedAt.toISOString(), nextCursor?.name]).toEqual([
      "2026-10-20T14:00:00.123Z",
      "z-invalid",
    ]);
  });

  it("counts skipped datasets in resultCount", async () => {
    const { resultCount } = await createCkanDiscoveryClient(
      _pageEndingInAnInvalidDataset(),
    ).searchDatasets({ baseUrl: BASE_URL, rows: 1000 });

    expect(resultCount).toBe(2);
  });

  it("has no cursor on an empty page", async () => {
    const page = await createCkanDiscoveryClient(_searchHttp()).searchDatasets(
      { baseUrl: BASE_URL, rows: 1000 },
    );

    expect([page.nextCursor, page.resultCount]).toEqual([undefined, 0]);
  });

  it("throws when a result has no metadata_modified to place it in the sort", async () => {
    const http = _searchHttp([_wireDataset({ metadata_modified: null })]);

    await expect(
      createCkanDiscoveryClient(http).searchDatasets({
        baseUrl: BASE_URL,
        rows: 1000,
      }),
    ).rejects.toThrow("no usable name or metadata_modified");
  });

  it("throws when a result's metadata_modified is not a timestamp", async () => {
    const http = _searchHttp([_wireDataset({ metadata_modified: "soon" })]);

    await expect(
      createCkanDiscoveryClient(http).searchDatasets({
        baseUrl: BASE_URL,
        rows: 1000,
      }),
    ).rejects.toThrow("Not a CKAN timestamp");
  });

  it("throws a malformed-result error when results is missing", async () => {
    const http = _http({
      get: vi.fn(async () => {
        return { success: true, result: { count: 3 } };
      }),
    });

    await expect(
      createCkanDiscoveryClient(http).searchDatasets({
        baseUrl: BASE_URL,
        rows: 1000,
      }),
    ).rejects.toThrow("CKAN package_search returned a malformed result");
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
