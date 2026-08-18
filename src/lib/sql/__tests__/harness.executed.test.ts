import { DuckDBInstance } from "@duckdb/node-api";
import { describe, expect, it } from "vitest";

describe("executed test harness", () => {
  it("runs SQL against a real DuckDB and reads rows back", async () => {
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();

    const reader = await connection.runAndReadAll(
      "SELECT 1 AS one, 'two' AS two",
    );

    expect(reader.getRowObjects()).toEqual([{ one: 1, two: "two" }]);
  });

  it("supports the DuckDB-only syntax our SQL uses", async () => {
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();

    const reader = await connection.runAndReadAll(`
      SELECT * EXCLUDE (b) FROM (SELECT 1 AS a, 2 AS b)
    `);

    expect(reader.getRowObjects()).toEqual([{ a: 1 }]);
  });
});
