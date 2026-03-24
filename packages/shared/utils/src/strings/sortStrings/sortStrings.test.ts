import { describe, expect, it } from "vitest";
import { sortStrings, stringComparator } from "./sortStrings.ts";

describe("stringComparator", () => {
  it("returns a negative number when the first string sorts before the second", () => {
    expect(stringComparator("apple", "banana")).toBeLessThan(0);
  });

  it("returns a positive number when the first string sorts after the second", () => {
    expect(stringComparator("zebra", "apple")).toBeGreaterThan(0);
  });

  it("returns zero when both strings are equal", () => {
    expect(stringComparator("same", "same")).toBe(0);
  });
});

describe("sortStrings", () => {
  it("sorts strings in lexicographical order using the default comparator", () => {
    const input = ["gamma", "alpha", "beta"];
    expect(sortStrings(input)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("returns an empty array when given an empty array", () => {
    expect(sortStrings([])).toEqual([]);
  });

  it("returns a single-element copy when given one string", () => {
    const input = ["only"] as const;
    expect(sortStrings(input)).toEqual(["only"]);
  });

  it("does not mutate the input array", () => {
    const input = ["c", "a", "b"];
    sortStrings(input);
    expect(input).toEqual(["c", "a", "b"]);
  });

  it("uses a custom comparator when provided", () => {
    const input = ["a", "b", "c"];
    const result = sortStrings(input, (a, b) => {
      return b.localeCompare(a);
    });
    expect(result).toEqual(["c", "b", "a"]);
  });
});
