import { enumerateSocrataDrive } from "@pipelines/socrata/enumerateSocrataDrive/enumerateSocrataDrive";
import { describe, expect, it, vi } from "vitest";
import type { SocrataDiscoveryClient, SocrataDiscoveryResult } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";

const DRIVE: ConfiguredDrive = {
  baseUrl: "https://data.cityofnewyork.us",
  organizationName: "NYC Open Data",
};

/** A discovery client over a catalog of `size` datasets. */
function _discoveryOver(size: number): SocrataDiscoveryClient {
  const catalog: SocrataDiscoveryResult[] = Array.from(
    { length: size },
    (_, index) => {
      return {
        datasetId: `id${index}`,
        name: `Dataset ${index}`,
        domain: "data.cityofnewyork.us",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
    },
  );
  return {
    search: vi.fn(async ({ limit = 100, offset = 0 }) => {
      return {
        results: catalog.slice(offset, offset + limit),
        resultSetSize: size,
      };
    }),
  };
}

describe("enumerateSocrataDrive", () => {
  it("pages through the whole catalog when no limit is given", async () => {
    const rows = await enumerateSocrataDrive({
      drive: DRIVE,
      discovery: _discoveryOver(250),
    });
    expect(rows).toHaveLength(250);
  });

  it("returns at most limit rows", async () => {
    const rows = await enumerateSocrataDrive({
      drive: DRIVE,
      discovery: _discoveryOver(250),
      limit: 120,
    });
    expect(rows).toHaveLength(120);
  });

  it("asks for no more datasets than the limit, so a small limit costs one small request", async () => {
    const discovery = _discoveryOver(250);
    await enumerateSocrataDrive({ drive: DRIVE, discovery, limit: 5 });
    expect(vi.mocked(discovery.search).mock.calls).toEqual([
      [{ domains: ["data.cityofnewyork.us"], limit: 5, offset: 0 }],
    ]);
  });
});
