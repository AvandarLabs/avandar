import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeDuckDb } from "@avandar/etl";
import {
  createHdxFileColumnReader,
  readFileColumnsWithDuckDb,
} from "@pipelines/hdx/createHdxFileColumnReader/createHdxFileColumnReader";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CkanResource } from "$/connectors/open-data/CkanClient/CkanClient.types";

const BASE_URL = "https://data.humdata.org";

function _resource(overrides: Partial<CkanResource>): CkanResource {
  return {
    id: "res-1",
    name: "data.csv",
    format: "CSV",
    url: `${BASE_URL}/dataset/x/resource/res-1/download/data.csv`,
    url_type: "upload",
    size: 200,
    hash: "abc",
    last_modified: undefined,
    mimetype: undefined,
    datastore_active: false,
    ...overrides,
  };
}

describe("readFileColumnsWithDuckDb", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "hdx-file-columns-"));
  });

  afterEach(async () => {
    await rm(testRoot, { force: true, recursive: true });
  });

  it("sniffs a CSV's column names and types", async () => {
    const csvPath = join(testRoot, "data.csv");
    await writeFile(
      csvPath,
      "country,year,share\nKenya,2024,0.5\nChad,2025,1.5\n",
    );

    expect(
      await readFileColumnsWithDuckDb({ path: csvPath, format: "csv" }),
    ).toEqual([
      { name: "country", originalDataType: "VARCHAR", castDataType: "VARCHAR" },
      { name: "year", originalDataType: "BIGINT", castDataType: "BIGINT" },
      { name: "share", originalDataType: "DOUBLE", castDataType: "DOUBLE" },
    ]);
  });

  it("reads a Parquet file's column names and types from its footer", async () => {
    const parquetPath = join(testRoot, "data.parquet");
    const duckDb = new NodeDuckDb();
    await duckDb.execSQL(
      `COPY (SELECT 'Kenya' AS country, 2024::INTEGER AS year, DATE '2024-01-01' AS day) TO '${parquetPath}' (FORMAT PARQUET)`,
    );
    await duckDb.close();

    expect(
      await readFileColumnsWithDuckDb({ path: parquetPath, format: "parquet" }),
    ).toEqual([
      { name: "country", originalDataType: "VARCHAR", castDataType: "VARCHAR" },
      { name: "year", originalDataType: "INTEGER", castDataType: "BIGINT" },
      { name: "day", originalDataType: "DATE", castDataType: "DATE" },
    ]);
  });

  it("returns undefined for a file it cannot read", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      await readFileColumnsWithDuckDb({
        path: join(testRoot, "missing.parquet"),
        format: "parquet",
      }),
    ).toBeUndefined();
  });
});

describe("createHdxFileColumnReader", () => {
  it.each([
    ["on another host", "https://example.com/data.csv"],
    ["over plain HTTP", "http://data.humdata.org/dataset/x/download/data.csv"],
    ["that is a local path", "/etc/hosts"],
  ])("does not read a file %s", async (_label, url) => {
    const readFile = vi.fn();

    const columns = await createHdxFileColumnReader({
      baseUrl: BASE_URL,
      readFile,
    })(_resource({ url }));

    expect(columns).toBeUndefined();
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each([
    ["CSV", "csv"],
    ["Parquet", "parquet"],
  ])("reads a %s file on the drive as %s", async (format, expectedFormat) => {
    const readFile = vi.fn(async () => {
      return undefined;
    });
    const url = `${BASE_URL}/dataset/x/resource/res-1/download/data`;

    await createHdxFileColumnReader({ baseUrl: BASE_URL, readFile })(
      _resource({ format, url }),
    );

    expect(readFile).toHaveBeenCalledWith({
      path: url,
      format: expectedFormat,
    });
  });

  it("does not read a format it has no reader for", async () => {
    const readFile = vi.fn();

    await createHdxFileColumnReader({ baseUrl: BASE_URL, readFile })(
      _resource({ format: "XLSX" }),
    );

    expect(readFile).not.toHaveBeenCalled();
  });
});
