import { describe, expect, it } from "vitest";
import { computeValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";

const DATA = [
  { x: "a", v: 10, w: 5 },
  { x: "b", v: 20, w: 4 },
  { x: "c", v: 30, w: 3 },
];

describe("computeValueExtent", () => {
  it("takes the plain min and max when every series is its own bucket", () => {
    expect(computeValueExtent(DATA, [{ key: "v" }, { key: "w" }])).toEqual({
      min: 3,
      max: 30,
    });
  });

  it("sums row-wise when series share a stack", () => {
    expect(
      computeValueExtent(DATA, [
        { key: "v", stackId: "s" },
        { key: "w", stackId: "s" },
      ]),
    ).toEqual({ min: 15, max: 33 });
  });

  it("treats separate stack ids as independent stacks", () => {
    const data = [{ a: 1, b: 2, c: 10, d: 20 }];
    expect(
      computeValueExtent(data, [
        { key: "a", stackId: "left" },
        { key: "b", stackId: "left" },
        { key: "c", stackId: "right" },
        { key: "d", stackId: "right" },
      ]),
    ).toEqual({ min: 3, max: 30 });
  });

  it("sums positives and negatives separately within a stack", () => {
    const data = [{ up: 10, down: -4, alsoDown: -6 }];
    expect(
      computeValueExtent(data, [
        { key: "up", stackId: "s" },
        { key: "down", stackId: "s" },
        { key: "alsoDown", stackId: "s" },
      ]),
    ).toEqual({ min: -10, max: 10 });
  });

  it("handles all-negative data", () => {
    const data = [{ v: -5 }, { v: -1 }];
    expect(computeValueExtent(data, [{ key: "v" }])).toEqual({
      min: -5,
      max: -1,
    });
  });

  it("ignores non-numeric and null cells", () => {
    const data = [{ v: 5 }, { v: null }, { v: "not a number" }, { v: 9 }];
    expect(computeValueExtent(data, [{ key: "v" }])).toEqual({
      min: 5,
      max: 9,
    });
  });

  it("returns undefined for empty data", () => {
    expect(computeValueExtent([], [{ key: "v" }])).toBeUndefined();
  });

  it("returns undefined when no series are given", () => {
    expect(computeValueExtent(DATA, [])).toBeUndefined();
  });

  it("returns undefined when the column holds no finite values", () => {
    const data = [{ v: null }, { v: undefined }];
    expect(computeValueExtent(data, [{ key: "v" }])).toBeUndefined();
  });

  it("returns undefined when the column is missing entirely", () => {
    expect(computeValueExtent(DATA, [{ key: "nope" }])).toBeUndefined();
  });

  it("ignores cells that Number() would coerce to a finite zero", () => {
    // `Number("")`, `Number([])`, and `Number(false)` are all `0`. Left
    // unguarded they would drag the extent down to zero.
    const data = [{ v: 5 }, { v: "" }, { v: [] }, { v: false }, { v: 9 }];
    expect(computeValueExtent(data, [{ key: "v" }])).toEqual({
      min: 5,
      max: 9,
    });
  });

  it("reads numeric strings", () => {
    const data = [{ v: "5" }, { v: "9.5" }];
    expect(computeValueExtent(data, [{ key: "v" }])).toEqual({
      min: 5,
      max: 9.5,
    });
  });

  it("reads bigint values, which DuckDB returns for bigint columns", () => {
    const data = [{ v: 5n }, { v: 9n }];
    expect(computeValueExtent(data, [{ key: "v" }])).toEqual({
      min: 5,
      max: 9,
    });
  });

  it("never merges an ungrouped series into a same-named stack", () => {
    // The ungrouped series sits at index 1 and the stack is literally
    // named "1"; they must stay separate buckets.
    const data = [{ a: 100, b: 1 }];
    expect(
      computeValueExtent(data, [{ key: "a", stackId: "1" }, { key: "b" }]),
    ).toEqual({ min: 1, max: 100 });
  });
});
