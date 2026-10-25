import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ETL_INPUT_BASE_DIR,
  ETL_OUTPUT_BASE_DIR,
  ETL_PATHS_ROOT_ENV,
  getEtlLoadDir,
  getEtlOutputDir,
  getEtlPipelineInputDir,
  resetEtlPathsRootForTesting,
  setEtlPathsRootForTesting,
} from "@etl/EtlEngine/etlPaths";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { UUID } from "@avandar/utils";

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

  it("uses etl-output base and pipeline name in paths", () => {
    const runId = "00000000-0000-4000-8000-000000000001" as PipelineRunId;
    const pipelineName = "my-pipeline";
    expect(getEtlOutputDir(pipelineName, runId, "extract")).toBe(
      join(testRoot, ETL_OUTPUT_BASE_DIR, pipelineName, runId, "extract"),
    );
    expect(getEtlOutputDir(pipelineName, runId, "transform")).toBe(
      join(testRoot, ETL_OUTPUT_BASE_DIR, pipelineName, runId, "transform"),
    );
    expect(getEtlLoadDir(pipelineName, runId)).toBe(
      join(testRoot, ETL_OUTPUT_BASE_DIR, pipelineName, runId, "load"),
    );
    expect(getEtlPipelineInputDir(pipelineName)).toBe(
      join(testRoot, ETL_INPUT_BASE_DIR, pipelineName),
    );
  });
});

describe("etlPaths ETL_PATHS_ROOT env", () => {
  afterEach(() => {
    delete process.env[ETL_PATHS_ROOT_ENV];
    resetEtlPathsRootForTesting();
  });

  it("uses ETL_PATHS_ROOT when the test override is unset", () => {
    process.env[ETL_PATHS_ROOT_ENV] = "/custom/root";

    expect(getEtlPipelineInputDir("my-pipeline")).toBe(
      join("/custom/root", ETL_INPUT_BASE_DIR, "my-pipeline"),
    );
  });
});
