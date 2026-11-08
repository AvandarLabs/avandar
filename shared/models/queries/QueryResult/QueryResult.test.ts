import { describe, expect, it } from "vitest";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

describe("QueryResult.isListColumn", () => {
  it("is true for a list column", () => {
    expect(
      QueryResult.isListColumn({
        name: "Symptoms",
        dataType: "varchar",
        isArray: true,
      }),
    ).toBe(true);
  });

  it("is false for a column that is not marked as a list", () => {
    expect(
      QueryResult.isListColumn({ name: "County", dataType: "varchar" }),
    ).toBe(false);
  });
});
