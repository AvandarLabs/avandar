import { describe, expect, it } from "vitest";
import { buildSqlDisplayCatalog } from "@/components/sql/sql-helpers/buildSqlDisplayCatalog/buildSqlDisplayCatalog";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const DS_ID = "00000000-0000-4000-8000-000000000001" as DatasetId;

describe("buildSqlDisplayCatalog", () => {
  it("maps datasets and columns into SqlDisplayCatalog shape", () => {
    const catalog = buildSqlDisplayCatalog({
      datasets: [
        {
          id: DS_ID,
          name: "Sales",
        } as never,
      ],
      columns: [
        { datasetId: DS_ID, name: "amount" },
        { datasetId: DS_ID, name: "region" },
      ],
    });
    expect(catalog).toEqual({
      datasets: [
        {
          id: DS_ID,
          name: "Sales",
          columns: [{ name: "amount" }, { name: "region" }],
        },
      ],
    });
  });
});
