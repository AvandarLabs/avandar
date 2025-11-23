import { describe, expect, it } from "vitest";
import { mapToArrayTuple } from "./index";

describe("mapToArrayTuple", () => {
  it("maps values into two separate arrays", () => {
    const [left, right] = mapToArrayTuple([1, 2, 3], (value) => {
      return [value * 2, value.toString()];
    });

    expect(left).toEqual([2, 4, 6]);
    expect(right).toEqual(["1", "2", "3"]);
  });

  it("passes the index to the callback", () => {
    const [, indexes] = mapToArrayTuple(["a", "b", "c"], (_value, idx) => {
      return [_value.toUpperCase(), idx];
    });

    expect(indexes).toEqual([0, 1, 2]);
  });

  it("returns empty arrays when input is empty", () => {
    const [left, right] = mapToArrayTuple([], () => {
      return ["", 0];
    });

    expect(left).toEqual([]);
    expect(right).toEqual([]);
  });
});
