import { describe, expect, it } from "vitest";
import { isFiltersByOperatorObject } from "@utils/filters/isFiltersByOperatorObject/isFiltersByOperatorObject.ts";
import type { FiltersByColumn, FiltersByOperator } from "@utils/filters/filters.ts";

type Row = { id: string };

describe("isFiltersByOperatorObject", () => {
  it("returns true for operator-structured filters", () => {
    const filters = { eq: [["id", "1"]] } as FiltersByOperator<Row>;
    expect(isFiltersByOperatorObject(filters)).toBe(true);
  });

  it("returns false when non-operator keys are present", () => {
    const filters = { id: { eq: "1" } } as FiltersByColumn<Row>;
    expect(isFiltersByOperatorObject(filters)).toBe(false);
  });

  it("treats empty objects as operator filters", () => {
    expect(isFiltersByOperatorObject({})).toBe(true);
  });
});
