import { describe, expect, it } from "vitest";
import { isNull } from "./isNull.ts";

describe("isNull", () => {
  it("returns true for null", () => {
    expect(isNull(null)).toBe(true);
  });
  it("returns false for non-null values", () => {
    expect(isNull("null")).toBe(false);
    expect(isNull(123)).toBe(false);
    expect(isNull(true)).toBe(false);
    expect(isNull(false)).toBe(false);
    expect(isNull(undefined)).toBe(false);
    expect(isNull({})).toBe(false);
    expect(isNull([])).toBe(false);
  });
});
