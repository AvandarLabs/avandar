import { describe, expect, it } from "vitest";
import { difference } from "./index";

describe("difference", () => {
  it("removes every occurrence found in the second array", () => {
    const result = difference([1, 2, 3, 4], [2, 4]);
    expect(result).toEqual([1, 3]);
  });

  it("removes duplicated values from the first array when second array has a single match", () => {
    const result = difference([1, 2, 2, 3, 2], [2]);
    expect(result).toEqual([1, 3]);
  });

  it("returns an empty array when arrays contain identical elements", () => {
    const result = difference(["a", "b"], ["a", "b"]);
    expect(result).toEqual([]);
  });
});
