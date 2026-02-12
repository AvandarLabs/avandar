import { describe, expect, it } from "vitest";
import { isNonNullish } from "./isNonNullish.ts";

describe("isNonNullish", () => {
  it("returns true for non-nullish values", () => {
    expect(isNonNullish("foo")).toBe(true);
    expect(isNonNullish(123)).toBe(true);
    expect(isNonNullish(true)).toBe(true);
    expect(isNonNullish(false)).toBe(true);
    expect(isNonNullish({})).toBe(true);
    expect(isNonNullish([])).toBe(true);
    expect(isNonNullish(() => {})).toBe(true);
    expect(isNonNullish(function () {})).toBe(true);
    expect(isNonNullish(Symbol("test"))).toBe(true);
    expect(isNonNullish(new Date())).toBe(true);
  });
  it("returns false for null", () => {
    expect(isNonNullish(null)).toBe(false);
  });
  it("returns false for undefined", () => {
    expect(isNonNullish(undefined)).toBe(false);
  });
});
