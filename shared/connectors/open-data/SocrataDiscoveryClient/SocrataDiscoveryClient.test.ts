import { describe, expect, it, vi } from "vitest";
import { createSocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

const DISCOVERY_BASE_URL = "https://api.us.socrata.com/api/catalog/v1";

function _http(overrides: Partial<OpenDataHttp> = {}): OpenDataHttp {
  return {
    get: vi.fn(async () => {
      return {
        results: [
          {
            resource: {
              id: "akvg-8vrb",
              name: "CDC Wastewater Data for Measles",
              createdAt: "2025-03-01T00:00:00.000Z",
              updatedAt: "2026-10-19T08:30:00.000Z",
            },
            metadata: { domain: "data.cdc.gov" },
          },
        ],
        resultSetSize: 1,
      };
    }),
    getBytes: vi.fn(),
    ...overrides,
  };
}

/** A raw Discovery result on the wire, with any field overridden. */
function _rawResult(
  overrides: Record<string, unknown> & { id: string },
): unknown {
  return {
    resource: {
      name: "Some dataset",
      createdAt: "2025-03-01T00:00:00.000Z",
      updatedAt: "2026-10-19T08:30:00.000Z",
      ...overrides,
    },
    metadata: { domain: "data.cdc.gov" },
  };
}

describe("SocrataDiscoveryClient.search", () => {
  it("searches across every portal when no domain is given", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({ query: "measles" });

    expect(http.get).toHaveBeenCalledWith(
      `${DISCOVERY_BASE_URL}?q=measles`,
    );
  });

  it("narrows to one portal when a domain is given", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({
      query: "measles",
      domains: ["data.cityofnewyork.us"],
    });

    expect(http.get).toHaveBeenCalledWith(
      `${DISCOVERY_BASE_URL}?q=measles&domains=data.cityofnewyork.us`,
    );
  });

  it("returns typed results with their timestamps and the total count", async () => {
    const http = _http();

    const page = await createSocrataDiscoveryClient(http).search({
      query: "measles",
    });

    expect(page).toEqual({
      results: [
        {
          datasetId: "akvg-8vrb",
          name: "CDC Wastewater Data for Measles",
          domain: "data.cdc.gov",
          createdAt: "2025-03-01T00:00:00.000Z",
          updatedAt: "2026-10-19T08:30:00.000Z",
        },
      ],
      resultSetSize: 1,
      skippedResults: [],
    });
  });

  it("sends an order when given", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({
      domains: ["data.cityofnewyork.us"],
      order: "updatedAt ASC",
    });

    const sentUrl = new URL(String(vi.mocked(http.get).mock.calls[0]?.[0]));
    expect(sentUrl.searchParams.get("order")).toBe("updatedAt ASC");
  });

  it("filters by categories and tags within the drive's own search context", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({
      domains: ["data.cityofnewyork.us"],
      searchContext: "data.cityofnewyork.us",
      categories: ["Education", "Health"],
      tags: ["doe"],
    });

    const sentUrl = new URL(String(vi.mocked(http.get).mock.calls[0]?.[0]));
    expect([
      sentUrl.searchParams.get("search_context"),
      sentUrl.searchParams.getAll("categories"),
      sentUrl.searchParams.getAll("tags"),
    ]).toEqual(["data.cityofnewyork.us", ["Education", "Health"], ["doe"]]);
  });

  it("rejects categories or tags without a search context, which match nothing", async () => {
    const http = _http();

    await expect(
      createSocrataDiscoveryClient(http).search({
        domains: ["data.cityofnewyork.us"],
        categories: ["Education"],
      }),
    ).rejects.toThrow("needs a searchContext");
    expect(http.get).not.toHaveBeenCalled();
  });

  it.each([
    ["updatedAt", "missing", undefined],
    ["updatedAt", "not a date", "yesterday"],
    ["updatedAt", "a date with no time zone", "2026-10-19T08:30:00"],
    ["createdAt", "not a date", "yesterday"],
  ])(
    "skips a result whose %s is %s and keeps the rest of the page",
    async (field, _label, badValue) => {
      const http = _http({
        get: vi.fn(async () => {
          return {
            results: [
              _rawResult({ id: "good-0001" }),
              _rawResult({ id: "bad--0001", [field]: badValue }),
              _rawResult({ id: "good-0002" }),
            ],
            resultSetSize: 3,
          };
        }),
      });

      const page = await createSocrataDiscoveryClient(http).search({
        query: "measles",
      });

      expect(page.results.map((result) => {return result.datasetId})).toEqual([
        "good-0001",
        "good-0002",
      ]);
      expect(page.resultSetSize).toBe(3);
      expect(page.skippedResults).toHaveLength(1);
      expect(page.skippedResults[0]?.datasetId).toBe("bad--0001");
      expect(page.skippedResults[0]?.reason).toContain(
        `resource.${field}`,
      );
    },
  );

  it("lists a skipped result with no readable id as undefined", async () => {
    const http = _http({
      get: vi.fn(async () => {
        return { results: [{ metadata: {} }], resultSetSize: 1 };
      }),
    });

    const page = await createSocrataDiscoveryClient(http).search({});

    expect(page.results).toEqual([]);
    expect(page.skippedResults).toEqual([
      { datasetId: undefined, reason: expect.any(String) },
    ]);
  });

  it.each([
    ["a missing resultSetSize", { results: [] }],
    ["a negative resultSetSize", { results: [], resultSetSize: -1 }],
    ["a fractional resultSetSize", { results: [], resultSetSize: 1.5 }],
    ["a results value that is not an array", { results: {}, resultSetSize: 0 }],
  ])("fails the page on %s", async (_label, body) => {
    const http = _http({ get: vi.fn(async () => {return body}) });

    await expect(
      createSocrataDiscoveryClient(http).search({}),
    ).rejects.toThrow();
  });

  it("passes a limit through when given", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({
      query: "measles",
      limit: 3,
    });

    expect(http.get).toHaveBeenCalledWith(
      `${DISCOVERY_BASE_URL}?q=measles&limit=3`,
    );
  });

  it("lists a domain's full catalog when no query is given", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({
      domains: ["data.cityofnewyork.us"],
    });

    expect(http.get).toHaveBeenCalledWith(
      `${DISCOVERY_BASE_URL}?domains=data.cityofnewyork.us`,
    );
  });

  it("passes an offset through when given, for paginating a large drive", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({
      domains: ["data.cityofnewyork.us"],
      limit: 100,
      offset: 200,
    });

    expect(http.get).toHaveBeenCalledWith(
      `${DISCOVERY_BASE_URL}?domains=data.cityofnewyork.us&limit=100&offset=200`,
    );
  });
});
