import { describe, expect, it } from "vitest";
import { getSqlMentionOptions } from "@/lib/sql/getSqlMentionOptions.ts";
import type { SqlDisplayCatalog } from "$/lib/sql/sqlDisplay.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";

const DS_ID = "00000000-0000-4000-8000-000000000001" as DatasetId;

const catalog: SqlDisplayCatalog = {
  datasets: [
    {
      id: DS_ID,
      name: "California cases",
      columns: [{ name: "Admin2" }, { name: "daily_new_cases" }],
    },
  ],
};

describe("getSqlMentionOptions", () => {
  it("returns datasets and columns filtered by query text", () => {
    const options = getSqlMentionOptions(catalog, "cali");
    expect(
      options.some((o) => {
        return o.kind === "dataset" && o.label === "California cases";
      }),
    ).toBe(true);
    expect(
      options.some((o) => {
        return o.kind === "column" && o.name === "Admin2";
      }),
    ).toBe(false);
  });

  it("returns column options when query matches a column name", () => {
    const options = getSqlMentionOptions(catalog, "admin");
    expect(
      options.some((o) => {
        return o.kind === "column" && o.name === "Admin2";
      }),
    ).toBe(true);
  });

  it("dataset apply value is a quoted dataset id", () => {
    const options = getSqlMentionOptions(catalog, "");
    const dataset = options.find((o) => {
      return o.kind === "dataset";
    });
    expect(dataset?.insertText).toBe(`"${DS_ID}"`);
  });
});
