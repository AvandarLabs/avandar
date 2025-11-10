import { describe, expect, it, vi } from "vitest";

import { makeBucketMap } from "./makeBucketMap";

describe("makeBucketMap", () => {
  it("groups entries by a provided key", () => {
    const data = [
      { id: 1, category: "fruit", value: "apple" },
      { id: 2, category: "fruit", value: "banana" },
      { id: 3, category: "vegetable", value: "kale" },
    ];

    const result = makeBucketMap(data, { key: "category", valueKey: "value" });

    expect(Array.from(result.entries())).toEqual([
      ["fruit", ["apple", "banana"]],
      ["vegetable", ["kale"]],
    ]);
  });

  it("derives bucket names with keyFn when key is omitted", () => {
    const data = [
      { name: "Alice", score: 91 },
      { name: "Bob", score: 72 },
      { name: "Cara", score: 48 },
    ];

    const result = makeBucketMap(data, {
      keyFn: (item) => {
        if (item.score >= 80) {
          return "pass";
        }
        return item.score >= 50 ? "borderline" : "fail";
      },
      valueFn: (item) => {
        return item.name;
      },
    });

    expect(result.get("pass")).toEqual(["Alice"]);
    expect(result.get("borderline")).toEqual(["Bob"]);
    expect(result.get("fail")).toEqual(["Cara"]);
  });

  it("prefers valueKey over valueFn when both are provided", () => {
    const data = [
      { region: "north", amount: 100, label: "override" },
    ];

    const fallbackValueFn = vi.fn(() => {
      throw new Error("valueFn should not be called when valueKey is provided");
    });

    const result = makeBucketMap(data, {
      key: "region",
      valueKey: "amount",
      valueFn: fallbackValueFn,
    });

    expect(result.get("north")).toEqual([100]);
    expect(fallbackValueFn).not.toHaveBeenCalled();
  });

  it("passes the computed bucket key into valueFn", () => {
    const data = [
      { customer: "A", tier: "gold", spend: 1000 },
      { customer: "B", tier: "gold", spend: 400 },
    ];

    const result = makeBucketMap(data, {
      key: "tier",
      valueFn: (item, bucketKey) => {
        return `${bucketKey}:${item.customer}:${item.spend}`;
      },
    });

    expect(result.get("gold")).toEqual([
      "gold:A:1000",
      "gold:B:400",
    ]);
  });

  it("returns an empty map for an empty list", () => {
    const empty: Array<{ type: string }> = [];
    const result = makeBucketMap(empty, { key: "type", valueKey: "type" });
    expect(result.size).toBe(0);
  });
});
