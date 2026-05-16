import { isUndefined } from "@utils/guards/isUndefined/isUndefined.ts";
import { describe, expect, it } from "vitest";

describe("isUndefined", () => {
  it("returns true for undefined", () => {
    expect(isUndefined(undefined)).toBe(true);
  });
  it("returns false for non-undefined values", () => {
    expect(isUndefined("undefined")).toBe(false);
    expect(isUndefined(123)).toBe(false);
    expect(isUndefined(true)).toBe(false);
    expect(isUndefined(false)).toBe(false);
    expect(isUndefined(null)).toBe(false);
    expect(isUndefined({})).toBe(false);
    expect(isUndefined([])).toBe(false);
  });
});
