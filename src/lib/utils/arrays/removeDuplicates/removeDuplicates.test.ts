import { describe, expect, it } from "vitest";
import { removeDuplicates } from "./index";

describe("removeDuplicates", () => {
  it("removes duplicate numbers while preserving first-seen order", () => {
    const input = [3, 1, 2, 3, 2, 4, 1, 5];
    const deduped = removeDuplicates(input, {});
    expect(deduped).toEqual([3, 1, 2, 4, 5]);
  });

  it("removes duplicate strings while preserving first-seen order", () => {
    const input = ["a", "b", "a", "c", "b", "d"];
    const deduped = removeDuplicates(input, {});
    expect(deduped).toEqual(["a", "b", "c", "d"]);
  });

  it("returns empty array when input is empty", () => {
    const input: number[] = [];
    const deduped = removeDuplicates(input, {});
    expect(deduped).toEqual([]);
  });

  it("keeps only the first occurrence based on hashFn for objects", () => {
    const input = [
      { id: 1, value: "x" },
      { id: 2, value: "y" },
      { id: 1, value: "z" }, // duplicate id, should be removed
      { id: 3, value: "w" },
      { id: 2, value: "k" }, // duplicate id, should be removed
    ];

    const deduped = removeDuplicates(input, {
      hashFn: (item) => {
        return item.id;
      },
    });
    expect(deduped).toEqual([
      { id: 1, value: "x" },
      { id: 2, value: "y" },
      { id: 3, value: "w" },
    ]);
  });

  it("does not dedupe objects without hashFn (different references)", () => {
    const input = [
      { id: 1, value: "x" },
      { id: 1, value: "x" },
    ];
    // Without a hash function, different object references are unique
    const deduped = removeDuplicates(input, {});
    expect(deduped).toHaveLength(2);
    expect(deduped).toEqual(input);
  });

  it("handles arrays where all items are duplicates (by hash)", () => {
    const input = [
      { id: 7, value: "a" },
      { id: 7, value: "b" },
      { id: 7, value: "c" },
    ];
    const deduped = removeDuplicates(input, {
      hashFn: (i) => {
        return i.id;
      },
    });
    expect(deduped).toEqual([{ id: 7, value: "a" }]);
  });
});
