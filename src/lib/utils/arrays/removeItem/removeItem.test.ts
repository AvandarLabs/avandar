import { describe, expect, it } from "vitest";
import { removeItem } from "./index";

describe("removeItem", () => {
  it("removes the value at the provided index", () => {
    const result = removeItem(["a", "b", "c", "d"], 2);
    expect(result).toEqual(["a", "b", "d"]);
  });

  it("returns the original array when the index is negative", () => {
    const input = [1, 2, 3];
    const result = removeItem(input, -1);
    expect(result).toBe(input);
  });

  it("returns the original array when the index is out of range", () => {
    const input = [1, 2, 3];
    const result = removeItem(input, 3);
    expect(result).toBe(input);
  });

  it("does not mutate the original array when removal happens", () => {
    const input = ["x", "y", "z"];
    const result = removeItem(input, 1);
    expect(input).toEqual(["x", "y", "z"]);
    expect(result).toEqual(["x", "z"]);
  });
});
