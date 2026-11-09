/**
 * Converts real JSON files with the Node DuckDB the pipeline server runs, so
 * the declared types, the UTC handling of offset timestamps, and the refusal
 * of a mistyped value are proven against DuckDB's own JSON reader.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { NodeDuckDb } from "@avandar/etl";
import { convertJsonFileToParquetParts } from "@pipeline-server/openDataParquetCache/convertToParquetParts/convertJsonFileToParquetParts/convertJsonFileToParquetParts";
import { summarizeParquetParts } from "@pipeline-server/openDataParquetCache/convertToParquetParts/convertToParquetParts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ListingDownloadColumn } from "@avandar/etl";

const LARGE_PART_BYTES = 64 * 1024 * 1024;

const COLUMNS: readonly ListingDownloadColumn[] = [
  { name: "Id", dataType: "BIGINT" },
  { name: "SpatialDim", dataType: "VARCHAR" },
  { name: "NumericValue", dataType: "DOUBLE" },
  { name: "IsLatest", dataType: "BOOLEAN" },
  { name: "Date", dataType: "TIMESTAMP" },
];

const ROW = {
  Id: 7,
  SpatialDim: "SDN",
  NumericValue: 12.5,
  IsLatest: true,
  Date: "2016-09-21T13:42:00+02:00",
};

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
    return await db.runRawQuery(
      sql.replace("$parts", `read_parquet([${list}])`),
    );
  } finally {
    await db.close();
  }
}

describe("convertJsonFileToParquetParts", () => {
  let testRoot: string;
  let partsDir: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "odc-json-parquet-"));
    partsDir = join(testRoot, "parts");
    await mkdir(partsDir);
  });

  afterEach(async () => {
    await rm(testRoot, { force: true, recursive: true });
  });

  async function _writeGzippedJson(body: unknown): Promise<string> {
    const jsonPath = join(testRoot, "source.json.gz");
    await writeFile(jsonPath, gzipSync(JSON.stringify(body)));
    return jsonPath;
  }

  async function _convert(
    jsonPath: string,
    columns: readonly ListingDownloadColumn[] = COLUMNS,
    recordsField = "value",
  ): Promise<string[]> {
    return await convertJsonFileToParquetParts({
      jsonPath,
      recordsField,
      columns,
      partsDir,
      maxPartBytes: LARGE_PART_BYTES,
    });
  }

  it("writes each column with its declared type, in declared order", async () => {
    const jsonPath = await _writeGzippedJson({
      "@odata.context": "https://ghoapi.azureedge.net/api/$metadata#WHS3_62",
      value: [ROW, { ...ROW, Id: 8, NumericValue: null }],
    });

    const parts = await _convert(jsonPath);

    expect(await summarizeParquetParts(parts)).toEqual({
      rowCount: 2,
      columns: [
        { name: "Id", dataType: "BIGINT" },
        { name: "SpatialDim", dataType: "VARCHAR" },
        { name: "NumericValue", dataType: "DOUBLE" },
        { name: "IsLatest", dataType: "BOOLEAN" },
        { name: "Date", dataType: "TIMESTAMP" },
      ],
    });
  });

  it("stores a timestamp with a UTC offset as its UTC time", async () => {
    const jsonPath = await _writeGzippedJson({ value: [ROW] });

    const parts = await _convert(jsonPath);

    expect(
      await _readRows(parts, 'SELECT "Date"::VARCHAR AS d FROM $parts'),
    ).toEqual([{ d: "2016-09-21 11:42:00" }]);
  });

  it("fails on a value that does not fit its declared type rather than storing null", async () => {
    const jsonPath = await _writeGzippedJson({
      value: [ROW, { ...ROW, Id: "seven" }],
    });

    await expect(_convert(jsonPath)).rejects.toThrow();
  });

  it("reads a file whose one JSON object is larger than DuckDB's default 16 MB object limit", async () => {
    const rows = Array.from({ length: 200_000 }, (_, index) => {
      return { ...ROW, Id: index };
    });
    const jsonPath = await _writeGzippedJson({ value: rows });

    const parts = await _convert(jsonPath);

    expect((await summarizeParquetParts(parts)).rowCount).toBe(200_000);
  });

  it.each([
    [
      "a column name with a quote",
      [{ name: 'Id"', dataType: "BIGINT" }],
      "value",
    ],
    [
      "a column name with a space",
      [{ name: "Spatial Dim", dataType: "VARCHAR" }],
      "value",
    ],
    ["a records field with a quote", COLUMNS, "val'ue"],
  ] as const)(
    "refuses %s before reading the file",
    async (_label, columns, recordsField) => {
      const jsonPath = await _writeGzippedJson({ value: [ROW] });

      await expect(_convert(jsonPath, columns, recordsField)).rejects.toThrow(
        /identifier/,
      );
    },
  );
});
