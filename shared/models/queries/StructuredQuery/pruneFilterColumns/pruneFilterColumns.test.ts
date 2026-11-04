import { describe, expect, it } from "vitest";
import { pruneFilterColumns } from "$/models/queries/StructuredQuery/pruneFilterColumns/pruneFilterColumns.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

const TREE: QueryFilterGroup = {
  type: "group",
  id: "g1",
  combinator: "AND",
  rules: [
    {
      type: "rule",
      id: "r1",
      columnId: "Admin2" as QueryColumn.Id,
      operator: "=",
      value: "a",
    },
    {
      type: "group",
      id: "g2",
      combinator: "OR",
      rules: [
        {
          type: "rule",
          id: "r2",
          columnId: "gone" as QueryColumn.Id,
          operator: "=",
          value: "b",
        },
        {
          type: "rule",
          id: "r3",
          columnId: "cases" as QueryColumn.Id,
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
      availableColumnIds: ["Admin2", "gone", "cases"] as QueryColumn.Id[],
    });
    expect(result.removedColumnIds).toEqual([]);
    expect(result.filters).toBe(TREE);
  });

  it("drops rules whose column is gone and reports them", () => {
    const result = pruneFilterColumns({
      filters: TREE,
      availableColumnIds: ["Admin2", "cases"] as QueryColumn.Id[],
    });
    expect(result.removedColumnIds).toEqual(["gone"]);
    const nested = result.filters.rules[1];
    expect(nested?.type === "group" && nested.rules).toHaveLength(1);
  });

  it("drops a group that ends up empty", () => {
    const result = pruneFilterColumns({
      filters: TREE,
      availableColumnIds: ["Admin2"] as QueryColumn.Id[],
    });
    expect(result.filters.rules).toHaveLength(1);
    expect(result.removedColumnIds).toEqual(["gone", "cases"]);
  });

  it("returns an empty group when nothing survives", () => {
    const result = pruneFilterColumns({
      filters: TREE,
      availableColumnIds: [],
    });
    expect(result.filters.rules).toEqual([]);
    expect(result.removedColumnIds).toEqual(["Admin2", "gone", "cases"]);
  });

  it("reports each missing column once", () => {
    const result = pruneFilterColumns({
      filters: {
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnId: "gone" as QueryColumn.Id,
            operator: "=",
            value: "a",
          },
          {
            type: "rule",
            columnId: "gone" as QueryColumn.Id,
            operator: "=",
            value: "b",
          },
        ],
      },
      availableColumnIds: [],
    });
    expect(result.removedColumnIds).toEqual(["gone"]);
  });
});
