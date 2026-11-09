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
});
