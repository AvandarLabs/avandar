import { describe, expect, it } from "vitest";
import { pruneFilterColumns } from "$/models/queries/StructuredQuery/pruneFilterColumns/pruneFilterColumns.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

const TREE: QueryFilterGroup = {
  type: "group",
  id: "g1",
  combinator: "AND",
  rules: [
    { type: "rule", id: "r1", columnName: "Admin2", operator: "=", value: "a" },
    {
      type: "group",
      id: "g2",
      combinator: "OR",
      rules: [
        {
          type: "rule",
          id: "r2",
          columnName: "gone",
          operator: "=",
          value: "b",
        },
        {
          type: "rule",
          id: "r3",
          columnName: "cases",
          operator: ">",
          value: 1,
        },
      ],
    },
  ],
};

describe("pruneFilterColumns", () => {
  it("keeps everything when every column still exists", () => {
    const result = pruneFilterColumns({
      filters: TREE,
      availableColumnNames: ["Admin2", "gone", "cases"],
    });
    expect(result.removedColumnNames).toEqual([]);
    expect(result.filters).toBe(TREE);
  });

  it("drops rules whose column is gone and reports them", () => {
    const result = pruneFilterColumns({
      filters: TREE,
      availableColumnNames: ["Admin2", "cases"],
    });
    expect(result.removedColumnNames).toEqual(["gone"]);
    const nested = result.filters.rules[1];
    expect(nested?.type === "group" && nested.rules).toHaveLength(1);
  });

  it("drops a group that ends up empty", () => {
    const result = pruneFilterColumns({
      filters: TREE,
      availableColumnNames: ["Admin2"],
    });
    expect(result.filters.rules).toHaveLength(1);
    expect(result.removedColumnNames).toEqual(["gone", "cases"]);
  });

  it("returns an empty group when nothing survives", () => {
    const result = pruneFilterColumns({
      filters: TREE,
      availableColumnNames: [],
    });
    expect(result.filters.rules).toEqual([]);
    expect(result.removedColumnNames).toEqual(["Admin2", "gone", "cases"]);
  });

  it("reports each missing column once", () => {
    const result = pruneFilterColumns({
      filters: {
        type: "group",
        combinator: "AND",
        rules: [
          { type: "rule", columnName: "gone", operator: "=", value: "a" },
          { type: "rule", columnName: "gone", operator: "=", value: "b" },
        ],
      },
      availableColumnNames: [],
    });
    expect(result.removedColumnNames).toEqual(["gone"]);
  });
});
