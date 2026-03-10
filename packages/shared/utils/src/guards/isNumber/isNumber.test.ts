import { describe, expect, it } from "vitest";
import { isNumber } from "./isNumber.ts";

describe("isNumber", () => {
  it("returns true for numbers", () => {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(123)).toBe(true);
    expect(isNumber(NaN)).toBe(true);
    expect(isNumber(Infinity)).toBe(true);
  });
  it("returns false for non-numbers", () => {
    expect(isNumber("123")).toBe(false);
    expect(isNumber(true)).toBe(false);
    expect(isNumber(false)).toBe(false);
    expect(isNumber(null)).toBe(false);
    expect(isNumber(undefined)).toBe(false);
    expect(isNumber({})).toBe(false);
    expect(isNumber([])).toBe(false);
  });
});
