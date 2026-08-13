import { describe, expect, it } from "vitest";
import { toFiniteNumber } from "@utils/numbers/toFiniteNumber/toFiniteNumber.ts";

describe("toFiniteNumber", () => {
  it("returns finite numbers unchanged", () => {
    expect(toFiniteNumber(0)).toBe(0);
    expect(toFiniteNumber(-12.5)).toBe(-12.5);
  });

  it("rejects non-finite numbers", () => {
    expect(toFiniteNumber(Number.NaN)).toBeUndefined();
    expect(toFiniteNumber(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(toFiniteNumber(Number.NEGATIVE_INFINITY)).toBeUndefined();
  });

  it("parses numeric strings, including surrounding whitespace", () => {
    expect(toFiniteNumber("42")).toBe(42);
    expect(toFiniteNumber(" -3.5 ")).toBe(-3.5);
  });

  it("rejects blank and non-numeric strings", () => {
    expect(toFiniteNumber("")).toBeUndefined();
    expect(toFiniteNumber("   ")).toBeUndefined();
    expect(toFiniteNumber("abc")).toBeUndefined();
  });

  it("rejects values that are neither numbers nor strings", () => {
    expect(toFiniteNumber(undefined)).toBeUndefined();
    expect(toFiniteNumber(null)).toBeUndefined();
    expect(toFiniteNumber(true)).toBeUndefined();
    expect(toFiniteNumber({})).toBeUndefined();
    expect(toFiniteNumber([1])).toBeUndefined();
  });
});
