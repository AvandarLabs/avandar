import { isSingleValueOperator } from "@utils/filters/isSingleValueOperator/isSingleValueOperator.ts";
import { describe, expect, it } from "vitest";

describe("isSingleValueOperator", () => {
  it("identifies single value operators", () => {
    expect(isSingleValueOperator("eq")).toBe(true);
  });

  it("rejects array-based operators", () => {
    expect(isSingleValueOperator("in")).toBe(false);
  });
});
