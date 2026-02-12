import { describe, expect, it } from "vitest";
import { isNullish } from "./isNullish.ts";

describe("isNullish", () => {
  it("returns true for null", () => {
    expect(isNullish(null)).toBe(true);
  });
  it("returns true for undefined", () => {
    expect(isNullish(undefined)).toBe(true);
  });
  it("returns false for non-nullish values", () => {
    expect(isNullish("foo")).toBe(false);
    expect(isNullish(123)).toBe(false);
    expect(isNullish(true)).toBe(false);
    expect(isNullish(false)).toBe(false);
    expect(isNullish({})).toBe(false);
    expect(isNullish([])).toBe(false);
    expect(isNullish(() => {})).toBe(false);
    expect(isNullish(function () {})).toBe(false);
    expect(isNullish(Symbol("test"))).toBe(false);
    expect(isNullish(new Date())).toBe(false);
  });
});
