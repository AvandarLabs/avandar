import { isFiltersByColumnObject } from "$/lib/utils/filters/isFiltersByColumnObject/isFiltersByColumnObject.ts";
import { describe, expect, it } from "vitest";
import type {
  FiltersByColumn,
  FiltersByOperator,
} from "$/lib/utils/filters/filters.types.ts";

type Row = { id: string };

describe("isFiltersByColumnObject", () => {
  it("returns true for column-structured filters", () => {
    const filters = { id: { eq: "1" } } as FiltersByColumn<Row>;
    expect(isFiltersByColumnObject(filters)).toBe(true);
  });

  it("returns false for operator-structured filters", () => {
    const filters = { eq: [["id", "1"]] } as FiltersByOperator<Row>;
    expect(isFiltersByColumnObject(filters)).toBe(false);
  });

  it("treats empty objects as column filters", () => {
    expect(isFiltersByColumnObject({})).toBe(true);
  });
});
