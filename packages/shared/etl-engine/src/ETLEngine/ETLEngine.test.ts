import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ETLEngine } from "@etl-engine/ETLEngine/ETLEngine.ts";
import {
  ETL_INPUT_BASE_DIR,
  ETL_OUTPUT_BASE_DIR,
  ETL_PATHS_ROOT_ENV,
  getETLLoadDir,
  getETLOutputDir,
  getETLPipelineInputDir,
  resetETLPathsRootForTesting,
  setETLPathsRootForTesting,
} from "@etl-engine/ETLEngine/etlPaths.ts";
import { transformedCSVsToParquetBlobs } from "@etl-engine/ETLEngine/transformedCSVsToParquetBlobs.ts";
import { MIMEType } from "@utils/types/common.types.ts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { UUID } from "@utils/types/common.types.ts";

type PipelineRunId = UUID<"PipelineRun">;

describe("etlPaths", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "etl-paths-"));
    setETLPathsRootForTesting(testRoot);
  });

  afterEach(() => {
    resetETLPathsRootForTesting();
  });

  it("uses etl-output base and pipeline name in paths", () => {
    const runId = "00000000-0000-4000-8000-000000000001" as PipelineRunId;
    const pipelineName = "my-pipeline";
    expect(getETLOutputDir(pipelineName, runId, "extract")).toBe(
      join(testRoot, ETL_OUTPUT_BASE_DIR, pipelineName, runId, "extract"),
    );
    expect(getETLOutputDir(pipelineName, runId, "transform")).toBe(
      join(testRoot, ETL_OUTPUT_BASE_DIR, pipelineName, runId, "transform"),
    );
    expect(getETLLoadDir(pipelineName, runId)).toBe(
      join(testRoot, ETL_OUTPUT_BASE_DIR, pipelineName, runId, "load"),
    );
    expect(getETLPipelineInputDir(pipelineName)).toBe(
      join(testRoot, ETL_INPUT_BASE_DIR, pipelineName),
    );
  });
});

describe("etlPaths ETL_PATHS_ROOT env", () => {
  afterEach(() => {
    delete process.env[ETL_PATHS_ROOT_ENV];
    resetETLPathsRootForTesting();
  });

  it("uses ETL_PATHS_ROOT when the test override is unset", () => {
    process.env[ETL_PATHS_ROOT_ENV] = "/custom/root";

    expect(getETLPipelineInputDir("my-pipeline")).toBe(
      join("/custom/root", ETL_INPUT_BASE_DIR, "my-pipeline"),
    );
  });
});

describe("transformedCSVsToParquetBlobs", () => {
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
    const blobs = await transformedCSVsToParquetBlobs({
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
    const blobs = await transformedCSVsToParquetBlobs({
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

describe("ETLEngine", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "etl-engine-"));
    setETLPathsRootForTesting(testRoot);
  });

  afterEach(async () => {
    resetETLPathsRootForTesting();
    await rm(testRoot, { force: true, recursive: true });
  });

  it("runs extract → identity copy → CSV → parquet on disk → load", async () => {
    const loadCalls: Array<{
      parquetTableBaseNames: readonly string[];
      pipelineName: string;
      pipelineRunId: PipelineRunId;
    }> = [];

    const pipelineName = "test-pipeline";

    const pipeline = ETLEngine.create({
      name: pipelineName,
      extract: async ({ pipelineRunId }) => {
        const extractDir = getETLOutputDir(
          pipelineName,
          pipelineRunId,
          "extract",
        );
        await writeFile(
          join(extractDir, "metrics.csv"),
          "day,count\n" + "1,5\n" + "2,7\n",
          "utf8",
        );
        return {
          files: [{ name: "metrics.csv", mimeType: MIMEType.TEXT_CSV }],
          context: { ok: true },
        };
      },
      transform: async () => {
        return [
          {
            name: "metrics",
            columns: [
              { name: "day", type: "BIGINT" },
              { name: "count", type: "BIGINT" },
            ],
          },
        ];
      },
      load: async (options) => {
        loadCalls.push(options);
      },
    });

    const { pipelineRunId } = await pipeline.run();
    expect(loadCalls).toEqual([
      {
        pipelineName,
        pipelineRunId,
        parquetTableBaseNames: ["metrics"],
      },
    ]);

    const parquetPath = join(
      testRoot,
      ETL_OUTPUT_BASE_DIR,
      pipelineName,
      pipelineRunId,
      "load",
      "metrics.parquet",
    );
    const bytes = await readFile(parquetPath);
    expect(bytes.byteLength).toBeGreaterThan(0);

    const descriptionsPath = join(
      testRoot,
      ETL_OUTPUT_BASE_DIR,
      pipelineName,
      pipelineRunId,
      "load",
      "transform-csv-descriptions.json",
    );
    const descriptionsJson = JSON.parse(
      await readFile(descriptionsPath, "utf8"),
    ) as unknown;
    expect(descriptionsJson).toEqual([
      {
        name: "metrics",
        columns: [
          { name: "day", type: "BIGINT" },
          { name: "count", type: "BIGINT" },
        ],
      },
    ]);
  });

  it("storeExtractedData writes under etl-output extract dir", async () => {
    const pipelineName = "store-test";
    const runId = "00000000-0000-4000-8000-000000000099" as PipelineRunId;
    const src = join(testRoot, "src.csv");
    await writeFile(src, "a,b\n1,2\n", "utf8");
    await ETLEngine.storeExtractedData({
      pipelineName,
      pipelineRunId: runId,
      sourcePath: src,
      destinationBasename: "out.csv",
    });
    const dest = join(
      testRoot,
      ETL_OUTPUT_BASE_DIR,
      pipelineName,
      runId,
      "extract",
      "out.csv",
    );
    const text = await readFile(dest, "utf8");
    expect(text).toContain("a,b");
  });

  it("getLoadParquetPathForTable points at load parquet path", () => {
    const runId = "00000000-0000-4000-8000-000000000088" as PipelineRunId;
    const path = ETLEngine.getLoadParquetPathForTable({
      pipelineName: "p",
      pipelineRunId: runId,
      tableBaseName: "t",
    });
    expect(path).toBe(
      join(testRoot, ETL_OUTPUT_BASE_DIR, "p", runId, "load", "t.parquet"),
    );
  });
});
