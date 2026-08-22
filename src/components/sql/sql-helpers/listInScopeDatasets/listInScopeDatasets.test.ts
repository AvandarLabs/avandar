import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";

import { describe, expect, it } from "vitest";

import { computeSqlScope } from "@/components/sql/sql-helpers/computeSqlScope/computeSqlScope";
import { listInScopeDatasets } from "@/components/sql/sql-helpers/listInScopeDatasets/listInScopeDatasets";

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

describe("listInScopeDatasets", () => {
  it("returns only datasets whose id is in scope", () => {
    const scope = computeSqlScope({
      sql: `SELECT * FROM "${CASES_ID}"`,
      catalog,
    });
    const inScope = listInScopeDatasets(scope, catalog);
    expect(inScope.length).toBe(1);
    expect(inScope[0]!.id).toBe(CASES_ID);
  });
});
