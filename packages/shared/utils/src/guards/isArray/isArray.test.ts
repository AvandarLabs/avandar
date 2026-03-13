import { describe, expect, it } from "vitest";
import { isArray } from "./isArray.ts";

describe("isArray", () => {
  it("returns true for arrays", () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2, 3])).toBe(true);
    expect(isArray(["a", "b", "c"])).toBe(true);
    expect(isArray([true, false])).toBe(true);
    expect(isArray([{}, {}])).toBe(true);
    expect(isArray([null, undefined])).toBe(true);
    expect(isArray([1, "a", true, {}])).toBe(true);
  });

  it("returns false for non-array values", () => {
    expect(isArray(null)).toBe(false);
    expect(isArray(undefined)).toBe(false);
    expect(isArray("string")).toBe(false);
    expect(isArray(123)).toBe(false);
    expect(isArray(true)).toBe(false);
    expect(isArray({})).toBe(false);
    expect(isArray({ length: 0 })).toBe(false);
    expect(isArray(() => {})).toBe(false);
    expect(isArray(new Date())).toBe(false);
  });
});
