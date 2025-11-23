import { describe, expect, it } from "vitest";
import { removeItemWhere } from "./index";

describe("removeItemWhere", () => {
  it("removes the first item that matches the predicate", () => {
    const result = removeItemWhere(["red", "blue", "green"], (value) => {
      return value === "blue";
    });

    expect(result).toEqual(["red", "green"]);
  });

  it("only removes the first matching value", () => {
    const input = [1, 2, 3, 2];
    const result = removeItemWhere(input, (value) => {
      return value === 2;
    });

    expect(result).toEqual([1, 3, 2]);
  });

  it("returns the original array reference when nothing matches", () => {
    const input = [1, 2, 3];
    const result = removeItemWhere(input, (value) => {
      return value === 4;
    });

    expect(result).toBe(input);
  });
});
