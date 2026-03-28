import { describe, expect, it } from "vitest";
import { isArrayValueOperator } from "@utils/filters/isArrayValueOperator/isArrayValueOperator.ts";

describe("isArrayValueOperator", () => {
  it("identifies array-based operators", () => {
    expect(isArrayValueOperator("in")).toBe(true);
  });

  it("rejects single value operators", () => {
    expect(isArrayValueOperator("eq")).toBe(false);
  });
});
