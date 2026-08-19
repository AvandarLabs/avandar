import { describe, expect, it } from "vitest";
import { makeRectangleRing } from "@/views/GisApp/tools/makeRectangleRing/makeRectangleRing";

describe("makeRectangleRing", () => {
  it("builds a closed lng-lat rectangle from two corners", () => {
    expect(makeRectangleRing([0, 0], [2, 1])).toEqual([
      [0, 0],
      [2, 0],
      [2, 1],
      [0, 1],
      [0, 0],
    ]);
  });

  it("orders corners regardless of drag direction", () => {
    expect(makeRectangleRing([2, 1], [0, 0])).toEqual([
      [0, 0],
      [2, 0],
      [2, 1],
      [0, 1],
      [0, 0],
    ]);
  });

  it("returns an empty ring when the drag has no area", () => {
    expect(makeRectangleRing([1, 4], [1, 9])).toEqual([]);
    expect(makeRectangleRing([3, 2], [8, 2])).toEqual([]);
  });
});
