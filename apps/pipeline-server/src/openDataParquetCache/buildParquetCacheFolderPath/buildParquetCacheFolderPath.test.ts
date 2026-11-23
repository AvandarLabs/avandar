import { buildParquetCacheFolderPath } from "@pipeline-server/openDataParquetCache/buildParquetCacheFolderPath/buildParquetCacheFolderPath";
import { describe, expect, it } from "vitest";

describe("buildParquetCacheFolderPath", () => {
  it("names the folder after the listing and the build that writes it", () => {
    const folderPath = buildParquetCacheFolderPath({
      catalogListingId: "4b0c4e0e-0000-4000-8000-000000000001",
      buildId: "9f1d2c3b-0000-4000-8000-000000000002",
    });

    expect(folderPath).toBe(
      "catalog-cache/4b0c4e0e-0000-4000-8000-000000000001/9f1d2c3b-0000-4000-8000-000000000002",
    );
  });
});
