import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { transformedCsvsToParquetBlobs } from "@etl/EtlEngine/transformedCsvsToParquetBlobs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("transformedCsvsToParquetBlobs", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "etl-parquet-"));
  });

  afterEach(async () => {
    await rm(testRoot, { force: true, recursive: true });
  });

  it("reads typed CSVs and returns ZSTD Parquet blobs in order", async () => {
    const transformDir = join(testRoot, "transform");
    await mkdir(transformDir, { recursive: true });
    await writeFile(
      join(transformDir, "sales.csv"),
      "region,amount\n" + "east,10\n" + "west,20\n",
      "utf8",
    );
    const blobs = await transformedCsvsToParquetBlobs({
      transformOutputDir: transformDir,
      descriptions: [
        {
          name: "sales",
          columns: [
            { name: "region", type: "VARCHAR" },
            { name: "amount", type: "BIGINT" },
          ],
        },
      ],
    });
    expect(blobs).toHaveLength(1);
    expect(blobs[0]?.size).toBeGreaterThan(0);
  });

  it("reads fully inferred CSV when columns array is empty", async () => {
    const transformDir = join(testRoot, "transform");
    await mkdir(transformDir, { recursive: true });
    await writeFile(
      join(transformDir, "sales.csv"),
      "region,amount\n" + "east,10\n" + "west,20\n",
      "utf8",
    );
    const blobs = await transformedCsvsToParquetBlobs({
      transformOutputDir: transformDir,
      descriptions: [
        {
          name: "sales",
          columns: [],
        },
      ],
    });
    expect(blobs).toHaveLength(1);
    expect(blobs[0]?.size).toBeGreaterThan(0);
  });
});
