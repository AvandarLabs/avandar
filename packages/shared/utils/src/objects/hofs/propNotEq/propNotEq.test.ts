import { describe, expect, it } from "vitest";
import { propNotEq } from "@utils/objects/hofs/propNotEq/propNotEq.ts";

describe("propNotEq", () => {
  it("returns true when the property does not equal the value", () => {
    type Item = { status: string };
    const isNotActive = propNotEq<Item, "status", string>("status", "active");

    expect(isNotActive({ status: "inactive" })).toBe(true);
  });

  it("returns false when the property equals the value", () => {
    type Item = { status: string };
    const isNotActive = propNotEq<Item, "status", string>("status", "active");

    expect(isNotActive({ status: "active" })).toBe(false);
  });

  it("works as a filter predicate", () => {
    type Item = { type: string; name: string };
    const items: Item[] = [
      { type: "fruit", name: "apple" },
      { type: "veggie", name: "carrot" },
      { type: "fruit", name: "banana" },
    ];

    const nonFruits = items.filter(
      propNotEq<Item, "type", string>("type", "fruit"),
    );

    expect(nonFruits).toEqual([{ type: "veggie", name: "carrot" }]);
  });

  it("checks nested values via dot notation", () => {
    type Obj = { meta: { level: number } };
    const isNotLevel2 = propNotEq<Obj, "meta.level", number>("meta.level", 2);

    expect(isNotLevel2({ meta: { level: 3 } })).toBe(true);
    expect(isNotLevel2({ meta: { level: 2 } })).toBe(false);
  });
});
