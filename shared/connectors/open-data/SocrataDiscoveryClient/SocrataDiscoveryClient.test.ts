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
            resource: { id: "akvg-8vrb", name: "CDC Wastewater Data for Measles" },
            metadata: { domain: "data.cdc.gov" },
          },
        ],
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

  it("returns a flattened, typed result list", async () => {
    const http = _http();

    const results = await createSocrataDiscoveryClient(http).search({
      query: "measles",
    });

    expect(results).toEqual([
      { datasetId: "akvg-8vrb", name: "CDC Wastewater Data for Measles", domain: "data.cdc.gov" },
    ]);
  });

  it("passes a limit through when given", async () => {
    const http = _http();

    await createSocrataDiscoveryClient(http).search({ query: "measles", limit: 3 });

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
