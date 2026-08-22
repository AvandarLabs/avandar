import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";

import { describe, expect, it } from "vitest";

import { computeSqlScope } from "@/components/sql/sql-helpers/computeSqlScope/computeSqlScope";

const CASES_ID = "00000000-0000-4000-8000-000000000001" as DatasetId;
const ORDERS_ID = "00000000-0000-4000-8000-000000000002" as DatasetId;

const catalog: SqlDisplayCatalog = {
  datasets: [
    {
      id: CASES_ID,
      name: "Cases",
      columns: [{ name: "Admin2" }, { name: "count" }],
    },
    {
      id: ORDERS_ID,
      name: "Orders",
      columns: [{ name: "order_id" }, { name: "total" }],
    },
  ],
};

describe("computeSqlScope", () => {
  it("returns the datasets referenced in the SQL", () => {
    const scope = computeSqlScope({
      sql: `SELECT "Admin2" FROM "${CASES_ID}"`,
      catalog,
    });
    expect(scope.datasetIds.has(CASES_ID)).toBe(true);
    expect(scope.datasetIds.has(ORDERS_ID)).toBe(false);
  });

  it("returns the union of column names from in-scope datasets", () => {
    const scope = computeSqlScope({
      sql: `SELECT * FROM "${CASES_ID}"`,
      catalog,
    });
    expect(Array.from(scope.columnNames).sort()).toEqual(["Admin2", "count"]);
  });

  it("does not include columns from out-of-scope datasets", () => {
    const scope = computeSqlScope({
      sql: `SELECT * FROM "${CASES_ID}"`,
      catalog,
    });
    expect(scope.columnNames.has("order_id")).toBe(false);
    expect(scope.columnNames.has("total")).toBe(false);
  });

  it("flags column tokens that don't belong to any in-scope dataset", () => {
    const sql = `SELECT "order_id" FROM "${CASES_ID}"`;
    const scope = computeSqlScope({ sql, catalog });
    expect(scope.outOfScopeColumnTokens.length).toBe(1);
    expect(scope.outOfScopeColumnTokens[0]!.name).toBe("order_id");
  });

  it("returns no out-of-scope columns when no datasets are referenced", () => {
    const scope = computeSqlScope({
      sql: `SELECT 1`,
      catalog,
    });
    expect(scope.datasetIds.size).toBe(0);
    expect(scope.outOfScopeColumnTokens.length).toBe(0);
  });
});
