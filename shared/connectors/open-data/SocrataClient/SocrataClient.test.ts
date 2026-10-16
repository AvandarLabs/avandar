import { describe, expect, it, vi } from "vitest";
import { createSocrataClient } from "$/connectors/open-data/SocrataClient/SocrataClient.ts";
import { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types.ts";

const BASE_URL = "https://data.cityofnewyork.us";
const DATASET_ID = "erm2-nwe9";

function _http(overrides: Partial<OpenDataHttp> = {}): OpenDataHttp {
  return {
    getJson: vi.fn(async () => {
      return {
        id: DATASET_ID,
        name: "311 Service Requests from 2020 to Present",
        rowsUpdatedAt: 1792114673,
        viewLastModified: 1767021900,
      };
    }),
    getBytes: vi.fn(async () => {
      return new TextEncoder().encode("a,b\n1,2\n") as Uint8Array<ArrayBuffer>;
    }),
    ...overrides,
  };
}

describe("SocrataClient.getMetadata", () => {
  it("requests the view metadata endpoint for the named dataset", async () => {
    const http = _http();

    await createSocrataClient(http).getMetadata({
      baseUrl: BASE_URL,
      socrataDatasetId: DATASET_ID,
    });

    expect(http.getJson).toHaveBeenCalledWith(
      `${BASE_URL}/api/views/${DATASET_ID}.json`,
    );
  });

  it("returns the freshness fields", async () => {
    const http = _http();

    const metadata = await createSocrataClient(http).getMetadata({
      baseUrl: BASE_URL,
      socrataDatasetId: DATASET_ID,
    });

    expect(metadata).toEqual({
      id: DATASET_ID,
      name: "311 Service Requests from 2020 to Present",
      rowsUpdatedAt: 1792114673,
      viewLastModified: 1767021900,
    });
  });

  it("tolerates a view with no rowsUpdatedAt", async () => {
    const http = _http({
      getJson: vi.fn(async () => {
        return { id: DATASET_ID, name: "No freshness fields" };
      }),
    });

    const metadata = await createSocrataClient(http).getMetadata({
      baseUrl: BASE_URL,
      socrataDatasetId: DATASET_ID,
    });

    expect(metadata.rowsUpdatedAt).toBeUndefined();
  });
});

describe("SocrataClient.getRowCount", () => {
  it("requests a count(*) select", async () => {
    const http = _http({
      getJson: vi.fn(async () => {
        return [{ count: "22811427" }];
      }),
    });

    const rowCount = await createSocrataClient(http).getRowCount({
      baseUrl: BASE_URL,
      socrataDatasetId: DATASET_ID,
    });

    expect(http.getJson).toHaveBeenCalledWith(
      `${BASE_URL}/resource/${DATASET_ID}.json?%24select=count(*)`,
    );
    expect(rowCount).toBe(22811427);
  });
});

describe("SocrataClient.getRows", () => {
  it("reads the .csv resource endpoint with a $limit", async () => {
    const http = _http();

    const csv = await createSocrataClient(http).getRows({
      baseUrl: BASE_URL,
      socrataDatasetId: DATASET_ID,
      maxRows: 100000,
    });

    expect(http.getBytes).toHaveBeenCalledWith(
      `${BASE_URL}/resource/${DATASET_ID}.csv?%24limit=100000`,
    );
    expect(csv).toBe("a,b\n1,2\n");
  });

  it("raises socrata-unreachable when the byte read throws", async () => {
    const http = _http({
      getBytes: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    });

    await expect(
      createSocrataClient(http).getRows({
        baseUrl: BASE_URL,
        socrataDatasetId: DATASET_ID,
        maxRows: 100000,
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return OpenDataAcquisitionFailed.is(error, "socrata-unreachable");
    });
  });
});
