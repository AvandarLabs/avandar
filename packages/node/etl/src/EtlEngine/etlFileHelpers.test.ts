import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getLoadParquetPathForTable,
  storeExtractedData,
} from "@etl/EtlEngine/etlFileHelpers";
import {
  ETL_OUTPUT_BASE_DIR,
  resetEtlPathsRootForTesting,
  setEtlPathsRootForTesting,
} from "@etl/EtlEngine/etlPaths";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EtlPipelineRunId } from "@etl/EtlEngine/EtlEngine.types";

describe("etlFileHelpers", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "etl-"));
    setEtlPathsRootForTesting(testRoot);
  });

  afterEach(async () => {
    resetEtlPathsRootForTesting();
    await rm(testRoot, { force: true, recursive: true });
  });

  it("copies an extracted file into the run's extract directory", async () => {
    const pipelineName = "store-test";
    const runId = "00000000-0000-4000-8000-000000000099" as EtlPipelineRunId;
    const src = join(testRoot, "src.csv");
    await writeFile(src, "a,b\n1,2\n", "utf8");
    await storeExtractedData({
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

  it("points a table at <run>/load/<table>.parquet", () => {
    const runId = "00000000-0000-4000-8000-000000000088" as EtlPipelineRunId;
    const path = getLoadParquetPathForTable({
      pipelineName: "p",
      pipelineRunId: runId,
      tableBaseName: "t",
    });
    expect(path).toBe(
      join(testRoot, ETL_OUTPUT_BASE_DIR, "p", runId, "load", "t.parquet"),
    );
  });
});
