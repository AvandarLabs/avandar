import { QueryFilterValue } from "$/models/queries/StructuredQuery/QueryFilterValue/QueryFilterValue.ts";
import { describe, expect, it } from "vitest";

describe("QueryFilterValue.getScalar", () => {
  it("passes primitives through", () => {
    expect(QueryFilterValue.getScalar("Alameda")).toBe("Alameda");
    expect(QueryFilterValue.getScalar(42)).toBe(42);
    expect(QueryFilterValue.getScalar(true)).toBe(true);
  });

  it("returns undefined for absent values", () => {
    expect(QueryFilterValue.getScalar(null)).toBeUndefined();
    expect(QueryFilterValue.getScalar("")).toBeUndefined();
    expect(QueryFilterValue.getScalar("   ")).toBeUndefined();
  });

  it("takes the first element of a list", () => {
    expect(QueryFilterValue.getScalar(["a", "b"])).toBe("a");
  });
});

describe("QueryFilterValue.getList", () => {
  it("passes arrays through, dropping empties", () => {
    expect(QueryFilterValue.getList({ value: ["a", "", "b"] })).toEqual([
      "a",
      "b",
    ]);
  });

  it("splits legacy comma-joined strings and trims", () => {
    expect(QueryFilterValue.getList({ value: " Alameda , Butte ," })).toEqual([
      "Alameda",
      "Butte",
    ]);
  });

  it("keeps values that contain a comma when they arrive as an array", () => {
    expect(QueryFilterValue.getList({ value: ["Korea, North"] })).toEqual([
      "Korea, North",
    ]);
  });

  it("returns an empty list for absent values", () => {
    expect(QueryFilterValue.getList({ value: null })).toEqual([]);
    expect(QueryFilterValue.getList({ value: "" })).toEqual([]);
  });
});

describe("QueryFilterValue.getPair", () => {
  it("returns both bounds from an array", () => {
    expect(QueryFilterValue.getPair([1, 2])).toEqual([1, 2]);
  });

  it("returns both bounds from a legacy comma string", () => {
    expect(QueryFilterValue.getPair("100,200")).toEqual(["100", "200"]);
  });

  it("returns undefined when a bound is missing", () => {
    expect(QueryFilterValue.getPair([1])).toBeUndefined();
    expect(QueryFilterValue.getPair("100,")).toBeUndefined();
    expect(QueryFilterValue.getPair(null)).toBeUndefined();
  });
});

describe("QueryFilterValue.makeLiteral", () => {
  it("coerces numeric columns to numbers", () => {
    expect(
      QueryFilterValue.makeLiteral({ value: "1000", dataType: "bigint" }),
    ).toBe(1000);
    expect(
      QueryFilterValue.makeLiteral({ value: "12.5", dataType: "double" }),
    ).toBe(12.5);
  });

  it("leaves unparseable numbers as strings so validation can report them", () => {
    expect(
      QueryFilterValue.makeLiteral({ value: "abc", dataType: "bigint" }),
    ).toBe("abc");
  });

  it("stringifies temporal and text values", () => {
    expect(
      QueryFilterValue.makeLiteral({ value: "2020-01-01", dataType: "date" }),
    ).toBe("2020-01-01");
    expect(
      QueryFilterValue.makeLiteral({ value: 5, dataType: "varchar" }),
    ).toBe("5");
  });

  it("passes values through unchanged when the column type is unknown", () => {
    expect(
      QueryFilterValue.makeLiteral({ value: "1000", dataType: undefined }),
    ).toBe("1000");
    expect(
      QueryFilterValue.makeLiteral({ value: 30, dataType: undefined }),
    ).toBe(30);
    expect(
      QueryFilterValue.makeLiteral({ value: true, dataType: undefined }),
    ).toBe(true);
  });
});
