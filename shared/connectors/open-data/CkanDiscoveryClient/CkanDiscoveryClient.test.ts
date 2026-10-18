import { describe, expect, it, vi } from "vitest";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
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
