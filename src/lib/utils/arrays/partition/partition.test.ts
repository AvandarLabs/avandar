import { describe, expect, it } from "vitest";
import { partition } from "./index";

describe("partition", () => {
  it("partitions values according to the predicate", () => {
    const [evens, odds] = partition([1, 2, 3, 4, 5], (value) => {
      return value % 2 === 0;
    });

    expect(evens).toEqual([2, 4]);
    expect(odds).toEqual([1, 3, 5]);
  });

  it("passes the index to the predicate", () => {
    const [, indexes] = partition(["skip", "keep", "skip"], (_value, idx) => {
      return idx % 2 === 0;
    });

    expect(indexes).toEqual(["keep"]);
  });

  it("returns two empty arrays when given an empty array", () => {
    const [truthy, falsy] = partition([], () => {
      return true;
    });

    expect(truthy).toEqual([]);
    expect(falsy).toEqual([]);
  });
});
