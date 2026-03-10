import { describe, expect, it } from "vitest";
import { isSingleValueOperator } from "./isSingleValueOperator.ts";

describe("isSingleValueOperator", () => {
  it("identifies single value operators", () => {
    expect(isSingleValueOperator("eq")).toBe(true);
  });

  it("rejects array-based operators", () => {
    expect(isSingleValueOperator("in")).toBe(false);
  });
});
