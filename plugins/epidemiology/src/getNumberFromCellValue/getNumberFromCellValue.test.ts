import { describe, expect, it } from "vitest";
import { getNumberFromCellValue } from "./getNumberFromCellValue";

describe("getNumberFromCellValue", () => {
  it("returns a finite number unchanged", () => {
    expect(getNumberFromCellValue(12.5)).toBe(12.5);
  });

  it("converts a bigint to a number", () => {
    expect(getNumberFromCellValue(42n)).toBe(42);
  });

  it("converts numeric text, ignoring surrounding whitespace", () => {
    expect(getNumberFromCellValue(" 7.25 ")).toBe(7.25);
  });

  it("returns undefined for blank text", () => {
    expect(getNumberFromCellValue("")).toBeUndefined();
    expect(getNumberFromCellValue("   ")).toBeUndefined();
  });

  it("returns undefined for text that is not a number", () => {
    expect(getNumberFromCellValue("n/a")).toBeUndefined();
  });

  it("returns undefined for a value that is not finite", () => {
    expect(getNumberFromCellValue(Number.NaN)).toBeUndefined();
    expect(getNumberFromCellValue(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(getNumberFromCellValue("Infinity")).toBeUndefined();
  });

  it("returns undefined for null, undefined, booleans, and objects", () => {
    expect(getNumberFromCellValue(null)).toBeUndefined();
    expect(getNumberFromCellValue(undefined)).toBeUndefined();
    expect(getNumberFromCellValue(true)).toBeUndefined();
    expect(getNumberFromCellValue({ value: 1 })).toBeUndefined();
  });
});
