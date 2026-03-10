import { describe, expect, it } from "vitest";
import { isNotNull } from "./isNotNull.ts";

describe("isNotNull", () => {
  it("returns true for non-null values", () => {
    expect(isNotNull("foo")).toBe(true);
    expect(isNotNull(123)).toBe(true);
    expect(isNotNull(true)).toBe(true);
    expect(isNotNull(false)).toBe(true);
    expect(isNotNull({})).toBe(true);
    expect(isNotNull([])).toBe(true);
    expect(isNotNull(() => {})).toBe(true);
    expect(isNotNull(function () {})).toBe(true);
    expect(isNotNull(Symbol("test"))).toBe(true);
    expect(isNotNull(new Date())).toBe(true);
    expect(isNotNull(undefined)).toBe(true);
  });
  it("returns false for null", () => {
    expect(isNotNull(null)).toBe(false);
  });
});
