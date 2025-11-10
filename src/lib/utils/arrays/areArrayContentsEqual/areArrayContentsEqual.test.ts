import { describe, expect, it } from "vitest";
import { areArrayContentsEqual } from "./index";

describe("areArrayContentsEqual", () => {
  it("returns true for the same reference", () => {
    const values = [1, 2, 3];
    expect(areArrayContentsEqual(values, values)).toBe(true);
  });

  it("ignores ordering when comparing primitives", () => {
    expect(areArrayContentsEqual(["a", "b", "c"], ["c", "b", "a"])).toBe(true);
  });

  it("returns false when lengths differ", () => {
    expect(areArrayContentsEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("returns false when second array contains an unknown value", () => {
    expect(areArrayContentsEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it("supports hashing to compare objects", () => {
    const left = [
      { id: 1, label: "a" },
      { id: 2, label: "b" },
    ];
    const right = [
      { id: 2, label: "B" },
      { id: 1, label: "A" },
    ];

    const result = areArrayContentsEqual(left, right, (item) => {
      return item.id;
    });

    expect(result).toBe(true);
  });
});
