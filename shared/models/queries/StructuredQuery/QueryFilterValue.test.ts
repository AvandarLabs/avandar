import {
  coerceFilterLiteral,
  filterValueAsList,
  filterValueAsPair,
  filterValueAsScalar,
} from "$/models/queries/StructuredQuery/QueryFilterValue.ts";
import { describe, expect, it } from "vitest";

describe("filterValueAsScalar", () => {
  it("passes primitives through", () => {
    expect(filterValueAsScalar("Alameda")).toBe("Alameda");
    expect(filterValueAsScalar(42)).toBe(42);
    expect(filterValueAsScalar(true)).toBe(true);
  });

  it("returns undefined for absent values", () => {
    expect(filterValueAsScalar(null)).toBeUndefined();
    expect(filterValueAsScalar("")).toBeUndefined();
    expect(filterValueAsScalar("   ")).toBeUndefined();
  });

  it("takes the first element of a list", () => {
    expect(filterValueAsScalar(["a", "b"])).toBe("a");
  });
});

describe("filterValueAsList", () => {
  it("passes arrays through, dropping empties", () => {
    expect(filterValueAsList(["a", "", "b"])).toEqual(["a", "b"]);
  });

  it("splits legacy comma-joined strings and trims", () => {
    expect(filterValueAsList(" Alameda , Butte ,")).toEqual([
      "Alameda",
      "Butte",
    ]);
  });

  it("keeps values that contain a comma when they arrive as an array", () => {
    expect(filterValueAsList(["Korea, North"])).toEqual(["Korea, North"]);
  });

  it("returns an empty list for absent values", () => {
    expect(filterValueAsList(null)).toEqual([]);
    expect(filterValueAsList("")).toEqual([]);
  });
});

describe("filterValueAsPair", () => {
  it("returns both bounds from an array", () => {
    expect(filterValueAsPair([1, 2])).toEqual([1, 2]);
  });

  it("returns both bounds from a legacy comma string", () => {
    expect(filterValueAsPair("100,200")).toEqual(["100", "200"]);
  });

  it("returns undefined when a bound is missing", () => {
    expect(filterValueAsPair([1])).toBeUndefined();
    expect(filterValueAsPair("100,")).toBeUndefined();
    expect(filterValueAsPair(null)).toBeUndefined();
  });
});

describe("coerceFilterLiteral", () => {
  it("coerces numeric columns to numbers", () => {
    expect(coerceFilterLiteral("1000", "bigint")).toBe(1000);
    expect(coerceFilterLiteral("12.5", "double")).toBe(12.5);
  });

  it("leaves unparseable numbers as strings so validation can report them", () => {
    expect(coerceFilterLiteral("abc", "bigint")).toBe("abc");
  });

  it("stringifies temporal and text values", () => {
    expect(coerceFilterLiteral("2020-01-01", "date")).toBe("2020-01-01");
    expect(coerceFilterLiteral(5, "varchar")).toBe("5");
  });

  it("passes values through unchanged when the column type is unknown", () => {
    expect(coerceFilterLiteral("1000", undefined)).toBe("1000");
    expect(coerceFilterLiteral(30, undefined)).toBe(30);
    expect(coerceFilterLiteral(true, undefined)).toBe(true);
  });
});
