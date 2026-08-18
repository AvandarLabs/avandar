import { describe, expect, it } from "vitest";
import { withDuckDb } from "./executedDuckDb";

describe("executed test harness", () => {
  it("runs SQL against a real DuckDB and reads rows back", async () => {
    await withDuckDb(async (connection) => {
      const reader = await connection.runAndReadAll(
        "SELECT 1 AS one, 'two' AS two",
      );

      expect(reader.getRowObjects()).toEqual([{ one: 1, two: "two" }]);
    });
  });

  it("supports the DuckDB-only syntax our SQL uses", async () => {
    await withDuckDb(async (connection) => {
      const reader = await connection.runAndReadAll(`
        SELECT * EXCLUDE (b) FROM (SELECT 1 AS a, 2 AS b)
      `);

      expect(reader.getRowObjects()).toEqual([{ a: 1 }]);
    });
  });
});
