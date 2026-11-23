import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PARQUET_COPY_TEMP_PREFIX } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";
import { removeLeftoverCopyTempDirs } from "@pipeline-server/openDataParquetCache/removeLeftoverCopyTempDirs/removeLeftoverCopyTempDirs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("removeLeftoverCopyTempDirs", () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "leftover-check-"));
  });

  afterEach(async () => {
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("deletes the temp folders builds left behind, and nothing else", async () => {
    const leftover = join(tempRoot, `${PARQUET_COPY_TEMP_PREFIX}abc123`);
    await mkdir(leftover);
    await writeFile(join(leftover, "source.csv.gz"), "x");
    await mkdir(join(tempRoot, "someone-else"));

    const removed = await removeLeftoverCopyTempDirs(tempRoot);

    expect(removed).toEqual([leftover]);
    expect(await readdir(tempRoot)).toEqual(["someone-else"]);
  });

  it("does nothing when the temp folder does not exist yet", async () => {
    await expect(
      removeLeftoverCopyTempDirs(join(tempRoot, "missing")),
    ).resolves.toEqual([]);
  });
});
