import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { duckDbDescribeColumnTypeToSniffable } from "@etl/NodeDuckDb/DuckDbSniffableDataType";
import { NodeDuckDb } from "@etl/NodeDuckDb/NodeDuckDb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("duckDbDescribeColumnTypeToSniffable", () => {
  it("maps catalog types to sniffable types", () => {
    expect(duckDbDescribeColumnTypeToSniffable("BIGINT")).toBe("BIGINT");
    expect(duckDbDescribeColumnTypeToSniffable("INTEGER")).toBe("BIGINT");
    expect(duckDbDescribeColumnTypeToSniffable("DOUBLE")).toBe("DOUBLE");
    expect(duckDbDescribeColumnTypeToSniffable("DECIMAL(10,2)")).toBe("DOUBLE");
    expect(duckDbDescribeColumnTypeToSniffable("VARCHAR")).toBe("VARCHAR");
    expect(duckDbDescribeColumnTypeToSniffable("TIMESTAMP")).toBe("TIMESTAMP");
    expect(
      duckDbDescribeColumnTypeToSniffable("TIMESTAMP WITH TIME ZONE"),
    ).toBe("TIMESTAMP");
    expect(duckDbDescribeColumnTypeToSniffable("UNKNOWN_TYPE")).toBe("VARCHAR");
  });
});

describe("NodeDuckDb.sniffCsv", () => {
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
    const db = new NodeDuckDb();
    try {
      const columns = await db.sniffCsv({ csvPath });
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
