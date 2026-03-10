import { describe, expect, it } from "vitest";
import { isString } from "./isString.ts";

describe("isString", () => {
  it("returns true for strings", () => {
    expect(isString("foo")).toBe(true);
    expect(isString("")).toBe(true);
  });
  it("returns false for non-strings", () => {
    expect(isString(123)).toBe(false);
    expect(isString(true)).toBe(false);
    expect(isString(false)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
    expect(isString({})).toBe(false);
    expect(isString([])).toBe(false);
  });
});
