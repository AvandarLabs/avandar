import { buildParquetCacheObjectPath } from "@pipeline-server/openDataParquetCache/buildParquetCacheObjectPath/buildParquetCacheObjectPath";
import { describe, expect, it } from "vitest";

describe("buildParquetCacheObjectPath", () => {
  it("names the object after the listing and its source version", () => {
    const objectPath = buildParquetCacheObjectPath({
      catalogListingId: "4b0c4e0e-0000-4000-8000-000000000001",
      sourceVersion: "2026-11-01T00:00:00Z",
    });

    expect(objectPath).toMatch(
      /^catalog-cache\/4b0c4e0e-0000-4000-8000-000000000001\/[0-9a-f]{16}\.parquet$/,
    );
  });

  it("gives a different object to a different source version", () => {
    const first = buildParquetCacheObjectPath({
      catalogListingId: "listing",
      sourceVersion: "v1",
    });
    const second = buildParquetCacheObjectPath({
      catalogListingId: "listing",
      sourceVersion: "v2",
    });

    expect(first).not.toBe(second);
  });
});
