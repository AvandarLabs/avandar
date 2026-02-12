import { describe, expect, it } from "vitest";
import { isFunction } from "./isFunction.ts";

describe("isFunction", () => {
  it("returns true for functions", () => {
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(function () {})).toBe(true);
  });
  it("returns false for non-functions", () => {
    expect(isFunction("function")).toBe(false);
    expect(isFunction(123)).toBe(false);
    expect(isFunction(true)).toBe(false);
    expect(isFunction(false)).toBe(false);
    expect(isFunction(null)).toBe(false);
    expect(isFunction(undefined)).toBe(false);
    expect(isFunction({})).toBe(false);
    expect(isFunction([])).toBe(false);
  });
});
