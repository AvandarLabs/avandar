import { describe, expect, it } from "vitest";

import { isEmptyFiltersObject } from "./isEmptyFiltersObject";
import type {
  FiltersByColumn,
  FiltersByOperator,
} from "@/lib/utils/filters/filters.types";

type Row = { id: string };

describe("isEmptyFiltersObject", () => {
  it("identifies undefined or empty inputs as empty", () => {
    expect(isEmptyFiltersObject(undefined)).toBe(true);
    expect(isEmptyFiltersObject({})).toBe(true);
  });

  it("checks nested column structures", () => {
    const populated = { id: { eq: "1" } } as FiltersByColumn<Row>;
    const empty = { id: {} } as FiltersByColumn<Row>;
    expect(isEmptyFiltersObject(populated)).toBe(false);
    expect(isEmptyFiltersObject(empty)).toBe(true);
  });

  it("checks operator structures", () => {
    const populated = { eq: [["id", "1"]] } as FiltersByOperator<Row>;
    const empty = { eq: [] } as FiltersByOperator<Row>;
    expect(isEmptyFiltersObject(populated)).toBe(false);
    expect(isEmptyFiltersObject(empty)).toBe(true);
  });
});
