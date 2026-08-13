import { getFiniteNumberFromValue } from "@utils/numbers/getFiniteNumberFromValue/getFiniteNumberFromValue.ts";
import { describe, expect, it } from "vitest";

describe("getFiniteNumberFromValue", () => {
  it("returns finite numbers unchanged", () => {
    expect(getFiniteNumberFromValue(0)).toBe(0);
    expect(getFiniteNumberFromValue(-12.5)).toBe(-12.5);
  });

  it("rejects non-finite numbers", () => {
    expect(getFiniteNumberFromValue(Number.NaN)).toBeUndefined();
    expect(getFiniteNumberFromValue(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(getFiniteNumberFromValue(Number.NEGATIVE_INFINITY)).toBeUndefined();
  });

  it("parses numeric strings, including surrounding whitespace", () => {
    expect(getFiniteNumberFromValue("42")).toBe(42);
    expect(getFiniteNumberFromValue(" -3.5 ")).toBe(-3.5);
  });

  it("rejects blank and non-numeric strings", () => {
    expect(getFiniteNumberFromValue("")).toBeUndefined();
    expect(getFiniteNumberFromValue("   ")).toBeUndefined();
    expect(getFiniteNumberFromValue("abc")).toBeUndefined();
  });

  it("rejects values that are neither numbers nor strings", () => {
    expect(getFiniteNumberFromValue(undefined)).toBeUndefined();
    expect(getFiniteNumberFromValue(null)).toBeUndefined();
    expect(getFiniteNumberFromValue(true)).toBeUndefined();
    expect(getFiniteNumberFromValue({})).toBeUndefined();
    expect(getFiniteNumberFromValue([1])).toBeUndefined();
  });
});
