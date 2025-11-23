import { describe, expect, it } from "vitest";
import { splitArray } from "./index";

describe("splitArray", () => {
  it("splits by predicate functions and omits matching items", () => {
    const chunks = splitArray([1, null, 2, null, 3], (value) => {
      return value === null;
    });

    expect(chunks).toEqual([[1], [2], [3]]);
  });

  it("splits by matching literal values", () => {
    const chunks = splitArray(["a", "|", "b", "|", "c"], "|");
    expect(chunks).toEqual([["a"], ["b"], ["c"]]);
  });

  it("returns a single chunk when the predicate never matches", () => {
    const chunks = splitArray([1, 2, 3], 0);
    expect(chunks).toEqual([[1, 2, 3]]);
  });

  it("returns an empty array when the input array is empty", () => {
    const chunks = splitArray([], () => {
      return true;
    });
    expect(chunks).toEqual([]);
  });

  it("only splits on the first match when splitOnce is true", () => {
    const chunks = splitArray(["a", "|", "b", "|", "c"], "|", {
      splitOnce: true,
    });

    expect(chunks).toEqual([["a"], ["b", "c"]]);
  });
});
