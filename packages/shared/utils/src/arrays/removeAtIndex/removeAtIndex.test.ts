import { removeAtIndex } from "@utils/arrays/removeAtIndex/removeAtIndex.ts";
import { describe, expect, it } from "vitest";

describe("removeAtIndex", () => {
  it("removes the item at the given index", () => {
    expect(removeAtIndex(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });

  it("removes the first item", () => {
    expect(removeAtIndex([1, 2, 3], 0)).toEqual([2, 3]);
  });

  it("removes the last item", () => {
    expect(removeAtIndex([1, 2, 3], 2)).toEqual([1, 2]);
  });

  it("returns an empty array when removing from a singleton", () => {
    expect(removeAtIndex(["only"], 0)).toEqual([]);
  });

  it("returns a shallow copy unchanged when the index is out of bounds", () => {
    expect(removeAtIndex([1, 2, 3], 5)).toEqual([1, 2, 3]);
    expect(removeAtIndex([1, 2, 3], -1)).toEqual([1, 2, 3]);
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3];
    removeAtIndex(input, 0);
    expect(input).toEqual([1, 2, 3]);
  });
});
