import { describe, expect, it } from "vitest";
import { makeDerivedColumnsSqlFromColumns } from "@/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";

/**
 * Three days of cases, returned newest first, so a window ordered by day runs
 * against the base query's row order.
 */
const BASE_SQL = `
  SELECT *
  FROM (VALUES
    (1, DATE '2024-01-01', 10),
    (2, DATE '2024-01-02', 20),
    (3, DATE '2024-01-03', 30)
  ) AS cases_by_day(id, day, cases)
  ORDER BY day DESC;
`;

const { sql: DERIVED_SQL } = makeDerivedColumnsSqlFromColumns({
  baseSql: BASE_SQL,
  existingColumnNames: ["id", "day", "cases"],
  columns: [
    {
      name: "cases_2d_avg",
      expression:
        "avg({cases}) OVER (ORDER BY {day} RANGE BETWEEN INTERVAL 1 DAY PRECEDING AND CURRENT ROW)",
      inputs: { cases: "cases", day: "day" },
    },
  ],
});

describe("makeDerivedColumnsSqlFromColumns in DuckDB", () => {
  it("keeps the base query's row order when a window column is added", async () => {
    const rows = await withDuckDb(async (connection) => {
      const reader = await connection.runAndReadAll(DERIVED_SQL);
      return reader.getRowObjectsJson();
    });

    expect(
      rows.map((row) => {
        return [row.id, row.cases_2d_avg];
      }),
    ).toEqual([
      [3, 25],
      [2, 15],
      [1, 10],
    ]);
  });

  it("returns the base columns and the added column, without the row number", async () => {
    const columnNames = await withDuckDb(async (connection) => {
      const reader = await connection.runAndReadAll(DERIVED_SQL);
      return reader.columnNames();
    });

    expect(columnNames).toEqual(["id", "day", "cases", "cases_2d_avg"]);
  });

  it("rejects read_csv used as a column expression in the wrapped query", async () => {
    // Built by hand in the wrapper's shape, since the host rejects this
    // expression before it is spliced. DuckDB's binder is a second guard.
    const wrappedSql = [
      "WITH ava_source AS (",
      "  SELECT *, row_number() OVER () AS __ava_row FROM (",
      "    SELECT 1 AS id",
      "  )",
      ")",
      "SELECT * EXCLUDE (__ava_row),",
      `  (read_csv('x')) AS "file_contents"`,
      "FROM ava_source",
      "ORDER BY __ava_row",
    ].join("\n");

    await expect(
      withDuckDb(async (connection) => {
        await connection.runAndReadAll(wrappedSql);
      }),
    ).rejects.toThrow(/table function but it was used as a scalar function/);
  });
});
