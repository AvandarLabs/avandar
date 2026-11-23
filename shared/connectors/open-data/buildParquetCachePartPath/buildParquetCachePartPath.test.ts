import { describe, expect, it } from "vitest";
import {
  buildParquetCachePartName,
  buildParquetCachePartPaths,
} from "$/connectors/open-data/buildParquetCachePartPath/buildParquetCachePartPath.ts";

describe("buildParquetCachePartName", () => {
  it("numbers parts from zero, padded so they sort in order", () => {
    expect([
      buildParquetCachePartName(0),
      buildParquetCachePartName(12),
    ]).toEqual(["part-00000.parquet", "part-00012.parquet"]);
  });
});

describe("buildParquetCachePartPaths", () => {
  it("lists every part of a copy's folder, in order", () => {
    expect(
      buildParquetCachePartPaths({
        folderPath: "catalog-cache/listing/build",
        partCount: 2,
      }),
    ).toEqual([
      "catalog-cache/listing/build/part-00000.parquet",
      "catalog-cache/listing/build/part-00001.parquet",
    ]);
  });
});
