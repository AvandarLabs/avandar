import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MIMEType } from "@utils/types/common.types.ts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ETLEngine } from "./ETLEngine.ts";
import {
  getEtlInputDir,
  getEtlLoadDir,
  getEtlOutputDir,
  resetEtlPathsRootForTesting,
  setEtlPathsRootForTesting,
} from "./etlPaths.ts";
import { transformedCsvsToParquetBlobs } from "./transformedCsvsToParquetBlobs.ts";
import type { UUID } from "@utils/types/common.types.ts";

type PipelineRunId = UUID<"PipelineRun">;

describe("etlPaths", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "etl-paths-"));
    setEtlPathsRootForTesting(testRoot);
  });

  afterEach(() => {
    resetEtlPathsRootForTesting();
  });

  it("resolves extract input under input/<run>/extract", () => {
    const runId = "00000000-0000-4000-8000-000000000001" as PipelineRunId;
    expect(getEtlInputDir(runId, "extract")).toBe(
      join(testRoot, "input", runId, "extract"),
    );
  });

  it("resolves transform input to prior extract output directory", () => {
    const runId = "00000000-0000-4000-8000-000000000002" as PipelineRunId;
    expect(getEtlInputDir(runId, "transform")).toBe(
      join(testRoot, "output", runId, "extract"),
    );
  });

  it("resolves extract and transform output dirs under output/<run>/", () => {
    const runId = "00000000-0000-4000-8000-000000000003" as PipelineRunId;
    expect(getEtlOutputDir(runId, "extract")).toBe(
      join(testRoot, "output", runId, "extract"),
    );
    expect(getEtlOutputDir(runId, "transform")).toBe(
      join(testRoot, "output", runId, "transform"),
    );
  });

  it("resolves load dir as output/<run>/load", () => {
    const runId = "00000000-0000-4000-8000-000000000004" as PipelineRunId;
    expect(getEtlLoadDir(runId)).toBe(join(testRoot, "output", runId, "load"));
  });
});

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
});

describe("ETLEngine", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "etl-engine-"));
    setEtlPathsRootForTesting(testRoot);
  });

  afterEach(async () => {
    resetEtlPathsRootForTesting();
    await rm(testRoot, { force: true, recursive: true });
  });

  it("runs extract → transform CSV → parquet on disk → load", async () => {
    const loadCalls: Array<{
      blobCount: number;
      pipelineRunId: PipelineRunId;
    }> = [];

    const pipeline = ETLEngine.create({
      name: "test-pipeline",
      extract: async ({ pipelineRunId }) => {
        expect(pipelineRunId).toBeDefined();
        return {
          files: [{ name: "raw.csv", mimeType: MIMEType.TEXT_CSV }],
          context: { ok: true },
        };
      },
      transform: async (_extracted, { pipelineRunId }) => {
        const dir = getEtlOutputDir(pipelineRunId, "transform");
        await writeFile(
          join(dir, "metrics.csv"),
          "day,count\n" + "1,5\n" + "2,7\n",
          "utf8",
        );
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
      load: async (parquetBlobs, { pipelineRunId }) => {
        loadCalls.push({
          blobCount: parquetBlobs.length,
          pipelineRunId,
        });
      },
    });

    const { pipelineRunId } = await pipeline.run();
    expect(loadCalls).toEqual([{ blobCount: 1, pipelineRunId }]);

    const parquetPath = join(
      testRoot,
      "output",
      pipelineRunId,
      "load",
      "metrics.parquet",
    );
    const bytes = await readFile(parquetPath);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});
