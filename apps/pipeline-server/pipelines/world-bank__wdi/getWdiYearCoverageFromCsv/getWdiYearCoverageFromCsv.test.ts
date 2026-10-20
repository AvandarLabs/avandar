import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeDuckDb } from "@avandar/etl";
import { getWdiYearCoverageFromCsv } from "@pipelines/world-bank__wdi/getWdiYearCoverageFromCsv/getWdiYearCoverageFromCsv";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "wdi-years-"));
});

afterEach(async () => {
  await rm(testDir, { force: true, recursive: true });
});

async function _coverageOf(csv: string, columnNames: readonly string[]) {
  const csvPath = join(testDir, "WDIfootnote.csv");
  await writeFile(csvPath, csv);
  const db = new NodeDuckDb();
  try {
    return await getWdiYearCoverageFromCsv({ db, csvPath, columnNames });
  } finally {
    await db.close();
  }
}

describe("getWdiYearCoverageFromCsv", () => {
  it("reads the first and last year from YRxxxx codes", async () => {
    await expect(
      _coverageOf("Country,Year\nAruba,YR1960\nAruba,YR2020\n", [
        "Country",
        "Year",
      ]),
    ).resolves.toEqual({ minYear: 1960, maxYear: 2020 });
  });

  it("is undefined for a CSV with no Year column", async () => {
    await expect(
      _coverageOf("Country,Topic\nAruba,Health\n", ["Country", "Topic"]),
    ).resolves.toBeUndefined();
  });
});
