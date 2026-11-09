import { applyFiltersToRows } from "@utils/filters/applyFiltersToRows/applyFiltersToRows.ts";
import { describe, expect, it } from "vitest";

const data = [
  { id: "1", status: "active" },
  { id: "2", status: "pending" },
  { id: "3", status: "inactive" },
];

describe("applyFiltersToRows", () => {
  it("handles column-based filters", () => {
    const result = applyFiltersToRows(data, {
      status: { eq: "active" },
    });

    expect(result).toEqual([{ id: "1", status: "active" }]);
  });

  it("handles operator-based filters", () => {
    const result = applyFiltersToRows(data, {
      in: [["status", ["active", "pending"]]],
    });

    expect(result).toHaveLength(2);
    expect(
      result.map((item) => {
        return item.id;
      }),
    ).toEqual(["1", "2"]);
  });

  it("returns input when filters are empty", () => {
    expect(applyFiltersToRows(data, {})).toBe(data);
  });

  it("keeps rows whose column is null when the filter is is", () => {
    const rows = [
      { id: "1", assignee: null },
      { id: "2", assignee: "user-1" },
    ];

    expect(applyFiltersToRows(rows, { assignee: { is: null } })).toEqual([
      { id: "1", assignee: null },
    ]);
  });

  it("keeps nulls when is is written in the operator shape", () => {
    const rows = [
      { id: "1", assignee: null },
      { id: "2", assignee: "user-1" },
    ];

    expect(applyFiltersToRows(rows, { is: [["assignee", null]] })).toEqual([
      { id: "1", assignee: null },
    ]);
  });
});
