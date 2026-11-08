import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { NodeDuckDb } from "@avandar/etl";
import {
  convertCsvFileToParquetParts,
  convertCsvPageToParquetFile,
  mergeParquetFilesIntoPart,
  summarizeParquetParts,
} from "@pipeline-server/openDataParquetCache/convertToParquetParts/convertToParquetParts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const LARGE_PART_BYTES = 64 * 1024 * 1024;

async function _readRows(
  parquetPaths: readonly string[],
  sql: string,
): Promise<readonly unknown[]> {
  const list = parquetPaths
    .map((path) => {
      return `'${path}'`;
    })
    .join(", ");
  const db = new NodeDuckDb();
  try {
    return await db.runRawQuery(sql.replace("$parts", `read_parquet([${list}])`));
  } finally {
    await db.close();
  }
}

describe("convertToParquetParts", () => {
  let testRoot: string;
  let partsDir: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "odc-parquet-"));
    partsDir = join(testRoot, "parts");
    await mkdir(partsDir);
  });

  afterEach(async () => {
    await rm(testRoot, { force: true, recursive: true });
  });

  describe("convertCsvFileToParquetParts", () => {
    it("writes every row with types read from the whole file", async () => {
      const csvPath = join(testRoot, "source.csv");
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

      const parts = await convertCsvFileToParquetParts({
        csvPath,
        partsDir,
        maxPartBytes: LARGE_PART_BYTES,
      });

      expect(await summarizeParquetParts(parts)).toEqual({
        rowCount: 30_001,
        columns: [
          { name: "code", dataType: "VARCHAR" },
          { name: "region", dataType: "VARCHAR" },
        ],
      });
      expect(
        await _readRows(parts, "SELECT code FROM $parts WHERE region = 'west'"),
      ).toEqual([{ code: "A-1" }]);
    });

    it("reads a quoted value that ends in an apostrophe", async () => {
      // From NYC's DOB Violations. DuckDB's lenient CSV mode merges these
      // two rows into one.
      const csvPath = join(testRoot, "source.csv");
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

      const parts = await convertCsvFileToParquetParts({
        csvPath,
        partsDir,
        maxPartBytes: LARGE_PART_BYTES,
      });

      expect(
        await _readRows(parts, "SELECT note FROM $parts ORDER BY id"),
      ).toEqual([
        { note: "CANCELLED,CITY OWNED'" },
        { note: "CANCELLED,CITY OWNED" },
      ]);
    });

    it("fails on a malformed row rather than shifting its values", async () => {
      const csvPath = join(testRoot, "source.csv");
      const goodRows = Array.from({ length: 30_000 }, (_, index) => {
        return `${index},x`;
      });
      await writeFile(
        csvPath,
        ["a,b", ...goodRows, "3,4,5", "6,7", ""].join("\n"),
        "utf8",
      );

      await expect(
        convertCsvFileToParquetParts({
          csvPath,
          partsDir,
          maxPartBytes: LARGE_PART_BYTES,
        }),
      ).rejects.toThrow(/Line: 30002/);
    });

    it("keeps numeric columns numeric", async () => {
      const csvPath = join(testRoot, "source.csv");
      await writeFile(csvPath, "cases,rate\n3,0.5\n4,1.25\n", "utf8");

      const parts = await convertCsvFileToParquetParts({
        csvPath,
        partsDir,
        maxPartBytes: LARGE_PART_BYTES,
      });

      expect((await summarizeParquetParts(parts)).columns).toEqual([
        { name: "cases", dataType: "BIGINT" },
        { name: "rate", dataType: "DOUBLE" },
      ]);
    });

    it("reads a gzipped CSV", async () => {
      const csvPath = join(testRoot, "source.csv.gz");
      await writeFile(csvPath, gzipSync("cases\n3\n4\n"));

      const parts = await convertCsvFileToParquetParts({
        csvPath,
        partsDir,
        maxPartBytes: LARGE_PART_BYTES,
      });

      expect((await summarizeParquetParts(parts)).rowCount).toBe(2);
    });

    it("splits a large file into parts, in order", async () => {
      const csvPath = join(testRoot, "source.csv");
      const rows = Array.from({ length: 400_000 }, (_, index) => {
        return `${index},${(index * 7919).toString(36)}`;
      });
      await writeFile(csvPath, ["id,code", ...rows, ""].join("\n"), "utf8");

      const parts = await convertCsvFileToParquetParts({
        csvPath,
        partsDir,
        maxPartBytes: 512 * 1024,
      });

      expect(parts.length).toBeGreaterThan(1);
      expect(parts).toEqual([...parts].sort());
      expect((await summarizeParquetParts(parts)).rowCount).toBe(400_000);
    });
  });

  describe("convertCsvPageToParquetFile", () => {
    const COLUMNS = [
      { name: "county", dataType: "VARCHAR" },
      { name: "cases", dataType: "DOUBLE" },
      { name: "reported_on", dataType: "TIMESTAMP" },
    ] as const;

    it("reads the declared types and the last row's cursor", async () => {
      const csvPath = join(testRoot, "page.csv");
      const parquetPath = join(testRoot, "page.parquet");
      // Row ids are not in text order: the cursor is the last row's.
      await writeFile(
        csvPath,
        [
          '":id","county","cases","reported_on"',
          '"row-zz","Kings","3","2024-01-05T00:00:00.000"',
          '"row-aa","Queens",,"2024-01-06T00:00:00.000"',
          "",
        ].join("\n"),
        "utf8",
      );

      const page = await convertCsvPageToParquetFile({
        csvPath,
        parquetPath,
        columns: COLUMNS,
        cursorColumn: ":id",
      });

      expect(page).toEqual({ rowCount: 2, lastCursor: "row-aa" });
      expect(
        await _readRows(
          [parquetPath],
          "SELECT typeof(cases) AS cases, typeof(reported_on) AS reported_on FROM $parts LIMIT 1",
        ),
      ).toEqual([{ cases: "DOUBLE", reported_on: "TIMESTAMP" }]);
    });

    it("fails on a value that does not fit its declared type", async () => {
      const csvPath = join(testRoot, "page.csv");
      await writeFile(
        csvPath,
        [
          '":id","county","cases","reported_on"',
          '"row-zz","Kings","three","2024-01-05T00:00:00.000"',
          "",
        ].join("\n"),
        "utf8",
      );

      await expect(
        convertCsvPageToParquetFile({
          csvPath,
          parquetPath: join(testRoot, "page.parquet"),
          columns: COLUMNS,
          cursorColumn: ":id",
        }),
      ).rejects.toThrow();
    });

    it("reads a page with no rows", async () => {
      const csvPath = join(testRoot, "page.csv");
      await writeFile(csvPath, '":id","county","cases","reported_on"\n');

      const page = await convertCsvPageToParquetFile({
        csvPath,
        parquetPath: join(testRoot, "page.parquet"),
        columns: COLUMNS,
        cursorColumn: ":id",
      });

      expect(page).toEqual({ rowCount: 0, lastCursor: undefined });
    });
  });

  describe("mergeParquetFilesIntoPart", () => {
    it("merges pages in order and leaves out the cursor", async () => {
      const pagePaths: string[] = [];
      for (const [index, county] of ["Kings", "Queens"].entries()) {
        const csvPath = join(testRoot, `page-${index}.csv`);
        const parquetPath = join(testRoot, `page-${index}.parquet`);
        await writeFile(
          csvPath,
          `":id","county"\n"row-${index}","${county}"\n`,
          "utf8",
        );
        await convertCsvPageToParquetFile({
          csvPath,
          parquetPath,
          columns: [{ name: "county", dataType: "VARCHAR" }],
          cursorColumn: ":id",
        });
        pagePaths.push(parquetPath);
      }
      const partPath = join(partsDir, "part.parquet");

      await mergeParquetFilesIntoPart({
        parquetPaths: pagePaths,
        partPath,
        excludedColumn: ":id",
      });

      expect(await _readRows([partPath], "SELECT * FROM $parts")).toEqual([
        { county: "Kings" },
        { county: "Queens" },
      ]);
    });
  });
});
