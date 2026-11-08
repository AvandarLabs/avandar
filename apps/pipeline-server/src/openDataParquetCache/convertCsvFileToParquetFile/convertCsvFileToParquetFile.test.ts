import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeDuckDb } from "@avandar/etl";
import { convertCsvFileToParquetFile } from "@pipeline-server/openDataParquetCache/convertCsvFileToParquetFile/convertCsvFileToParquetFile";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("convertCsvFileToParquetFile", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "odc-parquet-"));
  });

  afterEach(async () => {
    await rm(testRoot, { force: true, recursive: true });
  });

  it("writes every row with types read from the whole file", async () => {
    const csvPath = join(testRoot, "source.csv");
    const parquetPath = join(testRoot, "source.parquet");
    // A value that is not a number appears only on the last row, so a
    // type sniffed from the first rows alone would fail the conversion.
    const numericRows = Array.from({ length: 30_000 }, (_, index) => {
      return `${index},east`;
    });
    await writeFile(
      csvPath,
      ["code,region", ...numericRows, "A-1,west", ""].join("\n"),
      "utf8",
    );

    const summary = await convertCsvFileToParquetFile({ csvPath, parquetPath });

    expect(summary.rowCount).toBe(30_001);
    expect(summary.columns).toEqual([
      { name: "code", dataType: "VARCHAR" },
      { name: "region", dataType: "VARCHAR" },
    ]);
    const db = new NodeDuckDb();
    try {
      const lastRows = await db.runRawQuery(
        `SELECT code FROM read_parquet('${parquetPath}') WHERE region = 'west'`,
      );
      expect(lastRows).toEqual([{ code: "A-1" }]);
    } finally {
      await db.close();
    }
  });

  it("reads a quoted value that ends in an apostrophe", async () => {
    // From NYC's DOB Violations. DuckDB's lenient CSV mode merges these two
    // rows into one.
    const csvPath = join(testRoot, "source.csv");
    const parquetPath = join(testRoot, "source.parquet");
    await writeFile(
      csvPath,
      [
        '"id","note","street"',
        '"1","CANCELLED,CITY OWNED\'","58 ST"',
        '"2","CANCELLED,CITY OWNED","58 ST"',
        "",
      ].join("\n"),
      "utf8",
    );

    const summary = await convertCsvFileToParquetFile({ csvPath, parquetPath });

    expect(summary.rowCount).toBe(2);
    const db = new NodeDuckDb();
    try {
      const rows = await db.runRawQuery(
        `SELECT note FROM read_parquet('${parquetPath}') ORDER BY id`,
      );
      expect(rows).toEqual([
        { note: "CANCELLED,CITY OWNED'" },
        { note: "CANCELLED,CITY OWNED" },
      ]);
    } finally {
      await db.close();
    }
  });

  it("fails on a malformed row rather than shifting its values", async () => {
    const csvPath = join(testRoot, "source.csv");
    const parquetPath = join(testRoot, "source.parquet");
    const goodRows = Array.from({ length: 30_000 }, (_, index) => {
      return `${index},x`;
    });
    await writeFile(
      csvPath,
      ["a,b", ...goodRows, "3,4,5", "6,7", ""].join("\n"),
      "utf8",
    );

    await expect(
      convertCsvFileToParquetFile({ csvPath, parquetPath }),
    ).rejects.toThrow(/Line: 30002/);
  });

  it("keeps numeric columns numeric", async () => {
    const csvPath = join(testRoot, "source.csv");
    const parquetPath = join(testRoot, "source.parquet");
    await writeFile(csvPath, "cases,rate\n3,0.5\n4,1.25\n", "utf8");

    const summary = await convertCsvFileToParquetFile({ csvPath, parquetPath });

    expect(summary).toEqual({
      rowCount: 2,
      columns: [
        { name: "cases", dataType: "BIGINT" },
        { name: "rate", dataType: "DOUBLE" },
      ],
    });
  });
});
