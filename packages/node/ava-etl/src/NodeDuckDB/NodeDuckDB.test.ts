import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { duckDBDescribeColumnTypeToSniffable } from "@ava-etl/NodeDuckDB/DuckDBSniffableDataType";
import { NodeDuckDB } from "@ava-etl/NodeDuckDB/NodeDuckDB";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("duckDBDescribeColumnTypeToSniffable", () => {
  it("maps catalog types to sniffable types", () => {
    expect(duckDBDescribeColumnTypeToSniffable("BIGINT")).toBe("BIGINT");
    expect(duckDBDescribeColumnTypeToSniffable("INTEGER")).toBe("BIGINT");
    expect(duckDBDescribeColumnTypeToSniffable("DOUBLE")).toBe("DOUBLE");
    expect(duckDBDescribeColumnTypeToSniffable("DECIMAL(10,2)")).toBe("DOUBLE");
    expect(duckDBDescribeColumnTypeToSniffable("VARCHAR")).toBe("VARCHAR");
    expect(duckDBDescribeColumnTypeToSniffable("TIMESTAMP")).toBe("TIMESTAMP");
    expect(
      duckDBDescribeColumnTypeToSniffable("TIMESTAMP WITH TIME ZONE"),
    ).toBe("TIMESTAMP");
    expect(duckDBDescribeColumnTypeToSniffable("UNKNOWN_TYPE")).toBe("VARCHAR");
  });
});

describe("NodeDuckDB.sniffCSV", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "duck-sniff-"));
  });

  afterEach(async () => {
    await rm(testRoot, { force: true, recursive: true });
  });

  it("returns column names and sniffable types from a CSV", async () => {
    const csvPath = join(testRoot, "data.csv");
    await mkdir(testRoot, { recursive: true });
    await writeFile(
      csvPath,
      "region,amount,ok\n" + "east,10,true\n" + "west,3.5,false\n",
      "utf8",
    );
    const db = new NodeDuckDB();
    try {
      const columns = await db.sniffCSV({ csvPath });
      expect(
        columns.map((c) => {
          return c.name;
        }),
      ).toEqual(["region", "amount", "ok"]);
      expect(
        columns.map((c) => {
          return c.type;
        }),
      ).toEqual(["VARCHAR", "DOUBLE", "BOOLEAN"]);
    } finally {
      await db.close();
    }
  });
});
