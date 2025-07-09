import { describe, expect, it } from "vitest";
import {
  areArrayContentsEqual,
  difference,
  mapToArrayTuple,
  partition,
  removeItem,
  removeItemWhere,
} from "../arrays";

describe("difference", () => {
  it("returns items in first array no in second", () => {
    const result = difference([1, 2, 3], [2, 3]);
    expect(result).toEqual([1]);
  });

  it("returns empty array when both arrays are empty", () => {
    expect(difference([], [])).toEqual([]);
  });

  it("returns empty array when first array is empty", () => {
    expect(difference([], [1, 2, 3])).toEqual([]);
  });

  it("returns full first array when second array is empty", () => {
    expect(difference([1, 2, 3], [])).toEqual([1, 2, 3]);
  });

  it("returns full first array when no overlap", () => {
    expect(difference([1, 2], [3, 4])).toEqual([1, 2]);
  });
});

describe("areArrayContentsEqual", () => {
  it("returns true for arrays with same contents in different order", () => {
    expect(areArrayContentsEqual([1, 2, 3], [3, 2, 1])).toBe(true);
  });

  it("return false for arrays that do not have the same content", () => {
    expect(areArrayContentsEqual([1, 2, 3], [1, 2])).toBe(false);
  });

  it("returns 2 array of obejcts with same contents in different order as true", () => {
    expect(
      areArrayContentsEqual(
        [{ id: 1 }, { id: 2 }],
        [{ id: 2 }, { id: 1 }],
        (x) => x.id,
      ),
    ).toBe(true);
  });

  it("returns false when arrays have same length but different hashed values", () => {
    expect(
      areArrayContentsEqual(
        [{ id: 1 }, { id: 2 }],
        [{ id: 3 }, { id: 1 }],
        (x) => x.id,
      ),
    ).toBe(false);
  });
});

describe("mapToArrayTuple", () => {
  it("correctly maps input strings to lengths and repeated strings", () => {
    const input = ["a", "bb", "ccc"];

    const [lengths, repeats] = mapToArrayTuple(input, (str) => [
      str.length,
      str + str,
    ]);

    expect(lengths).toEqual([1, 2, 3]);
    expect(repeats).toEqual(["aa", "bbbb", "cccccc"]);
  });

  it("correctly maps input numbers to squared and tests if even", () => {
    const input = [1, 2, 3];

    const [squared, isEven] = mapToArrayTuple(input, (num) => [
      num * num,
      num % 2 === 0,
    ]);

    expect(squared).toEqual([1, 4, 9]);
    expect(isEven).toEqual([false, true, false]);
  });
});

describe("removeItem", () => {
  it("removes an item from an array given an index", () => {
    const input = ["apple", "banana", "cherry"];

    const updated = removeItem(input, 1);

    expect(updated).toEqual(["apple", "cherry"]);
  });

  it("returns a copy of original array with index -1", () => {
    const input = ["apple", "banana", "cherry"];

    const updated = removeItem(input, -1);

    expect(updated).toEqual(input);
  });
});

describe("removeItemWhere", () => {
  it("removes item from array when id matches predicate", () => {
    const input = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const updated = removeItemWhere(input, (i) => i.id === 2);

    expect(updated).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it("returns original array if no item matches predicate", () => {
    const input = [{ id: 1 }, { id: 2 }];

    const updated = removeItemWhere(input, (i) => i.id === 99);

    expect(updated).toEqual(input);
  });
});

describe("partition", () => {
  it("splits an array of numbers into even and odd groups", () => {
    const input = [1, 2, 3, 4, 5];

    const updated = partition(input, (num) => num % 2 === 0);

    expect(updated).toEqual([
      [2, 4],
      [1, 3, 5],
    ]);
  });
});
