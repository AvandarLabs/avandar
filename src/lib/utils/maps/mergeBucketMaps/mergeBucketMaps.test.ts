import { describe, expect, it } from "vitest";

import { mergeBucketMaps } from "./mergeBucketMaps";

describe("mergeBucketMaps", () => {
  it("concatenates buckets with matching keys", () => {
    const mapA = new Map([
      ["fruit", ["apple"]],
      ["vegetable", ["kale"]],
    ]);
    const mapB = new Map([
      ["fruit", ["pear"]],
      ["grain", ["rice"]],
    ]);

    const result = mergeBucketMaps(mapA, mapB);

    expect(Array.from(result.entries())).toEqual([
      ["fruit", ["apple", "pear"]],
      ["vegetable", ["kale"]],
      ["grain", ["rice"]],
    ]);
  });

  it("clones arrays so later mutations do not affect the source maps", () => {
    const source = new Map([["ids", [1, 2]]]);

    const result = mergeBucketMaps(source);
    const mergedValues = result.get("ids");

    expect(mergedValues).toEqual([1, 2]);
    expect(mergedValues).not.toBe(source.get("ids"));

    mergedValues?.push(3);
    expect(source.get("ids")).toEqual([1, 2]);
  });

  it("returns an empty map when no maps are provided", () => {
    const result = mergeBucketMaps();
    expect(result.size).toBe(0);
  });
});
