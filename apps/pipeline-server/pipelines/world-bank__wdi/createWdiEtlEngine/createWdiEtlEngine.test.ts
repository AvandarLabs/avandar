import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createInMemoryListingsStore,
  createInMemoryObjectStore,
  getEtlPipelineInputDir,
  resetEtlPathsRootForTesting,
  setEtlPathsRootForTesting,
} from "@avandar/etl";
import {
  createWdiEtlEngine,
  WDI_PIPELINE_NAME,
} from "@pipelines/world-bank__wdi/createWdiEtlEngine/createWdiEtlEngine";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const OUTPUT = {
  listingsTable: "data_catalog_listings",
  relationColumnsTable: "data_catalog_listings__relation_columns",
  bucket: "opendata",
};

let testRoot: string;

beforeEach(async () => {
  testRoot = await mkdtemp(join(tmpdir(), "wdi-engine-"));
  setEtlPathsRootForTesting(testRoot);
});

afterEach(async () => {
  resetEtlPathsRootForTesting();
  await rm(testRoot, { force: true, recursive: true });
});

describe("createWdiEtlEngine", () => {
  it("writes one Parquet listing per input CSV, with its object and columns", async () => {
    const inputDir = getEtlPipelineInputDir(WDI_PIPELINE_NAME);
    await mkdir(inputDir, { recursive: true });
    await writeFile(
      join(inputDir, "WDISeries.csv"),
      "Series Code,Topic\nAG.LND,Environment\n",
    );
    const listings = createInMemoryListingsStore();
    const objects = createInMemoryObjectStore();

    await createWdiEtlEngine({
      output: OUTPUT,
      stores: { listings, objects },
    }).run({ mode: "full" });

    const [row] = listings.getRows();
    expect([
      row?.display_name,
      row?.parquet_file_name,
      objects.getUploadedPaths(),
      listings.getRelationColumns(row?.id ?? "")?.map((column) => {
        return column.column_name;
      }),
    ]).toEqual([
      "WDI: Indicator definitions",
      "WDISeries.parquet",
      ["world-bank__wdi/datasets/WDISeries.parquet"],
      ["Series Code", "Topic"],
    ]);
  });

  it("rejects an incremental run before reading its input directory", async () => {
    const engine = createWdiEtlEngine({
      output: OUTPUT,
      stores: {
        listings: createInMemoryListingsStore(),
        objects: createInMemoryObjectStore(),
      },
    });

    await expect(engine.run({ mode: "incremental" })).rejects.toThrow(
      "does not support incremental runs",
    );
    expect(existsSync(getEtlPipelineInputDir(WDI_PIPELINE_NAME))).toBe(false);
  });
});
