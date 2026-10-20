import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createInMemoryListingsStore,
  createInMemoryObjectStore,
  EtlRunFailedError,
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

/** Writes each file into the WDI input directory, then runs a full load. */
async function _runFullWithInputs(files: Readonly<Record<string, string>>) {
  const inputDir = getEtlPipelineInputDir(WDI_PIPELINE_NAME);
  await mkdir(inputDir, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([filename, contents]) => {
      return writeFile(join(inputDir, filename), contents);
    }),
  );
  const listings = createInMemoryListingsStore();
  const objects = createInMemoryObjectStore();
  await createWdiEtlEngine({
    output: OUTPUT,
    stores: { listings, objects },
  }).run({ mode: "full" });
  return { listings, objects };
}

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

  it("converts an input whose extension is uppercase .CSV", async () => {
    const { listings, objects } = await _runFullWithInputs({
      "WDISeries.CSV": "Series Code,Topic\nAG.LND,Environment\n",
    });

    expect([
      listings.getRows().map((row) => {
        return row.parquet_file_name;
      }),
      objects.getUploadedPaths(),
    ]).toEqual([
      ["WDISeries.parquet"],
      ["world-bank__wdi/datasets/WDISeries.parquet"],
    ]);
  });

  it("keeps year_coverage in the stored metadata beside the engine's keys", async () => {
    const { listings } = await _runFullWithInputs({
      "WDIfootnote.csv": "Country,Year\nAruba,YR1960\nAruba,YR2020\n",
    });

    expect(listings.getRows()[0]?.metadata).toMatchObject({
      year_coverage: { min_year: 1960, max_year: 2020 },
      storage_object_path: "world-bank__wdi/datasets/WDIfootnote.parquet",
    });
  });

  it("rejects with the missing-CSV error when the input directory is empty", async () => {
    const error = await _runFullWithInputs({}).catch((caught: unknown) => {
      return caught;
    });

    expect(error).toBeInstanceOf(EtlRunFailedError);
    expect((error as EtlRunFailedError).errors[0]).toMatchObject({
      message: expect.stringContaining("No CSV files found under"),
    });
  });
});
