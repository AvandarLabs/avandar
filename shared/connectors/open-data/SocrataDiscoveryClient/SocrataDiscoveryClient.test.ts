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

  it.each([
    ["missing", undefined],
    ["not a date", "yesterday"],
    ["a date with no time zone", "2026-10-19T08:30:00"],
  ])("rejects a result whose updatedAt is %s", async (_label, updatedAt) => {
    const http = _http({
      get: vi.fn(async () => {
        return {
          results: [
            {
              resource: {
                id: "akvg-8vrb",
                name: "CDC Wastewater Data for Measles",
                createdAt: "2025-03-01T00:00:00.000Z",
                updatedAt,
              },
              metadata: { domain: "data.cdc.gov" },
            },
          ],
          resultSetSize: 1,
        };
      }),
    });

    await expect(
      createSocrataDiscoveryClient(http).search({ query: "measles" }),
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
