import { describe, expect, it } from "vitest";
import { propEq } from "@utils/objects/hofs/propEq/propEq.ts";

describe("propEq", () => {
  it("returns true when the property equals the value", () => {
    type Item = { status: string };
    const isActive = propEq<Item, "status", string>("status", "active");

    expect(isActive({ status: "active" })).toBe(true);
  });

  it("returns false when the property does not equal the value", () => {
    type Item = { status: string };
    const isActive = propEq<Item, "status", string>("status", "active");

    expect(isActive({ status: "inactive" })).toBe(false);
  });

  it("works as a filter predicate", () => {
    type Item = { type: string; name: string };
    const items: Item[] = [
      { type: "fruit", name: "apple" },
      { type: "veggie", name: "carrot" },
      { type: "fruit", name: "banana" },
    ];

    const fruits = items.filter(propEq<Item, "type", string>("type", "fruit"));

    expect(fruits).toEqual([
      { type: "fruit", name: "apple" },
      { type: "fruit", name: "banana" },
    ]);
  });

  it("checks nested values via dot notation", () => {
    type Obj = { meta: { level: number } };
    const isLevel2 = propEq<Obj, "meta.level", number>("meta.level", 2);

    expect(isLevel2({ meta: { level: 2 } })).toBe(true);
    expect(isLevel2({ meta: { level: 3 } })).toBe(false);
  });
});
