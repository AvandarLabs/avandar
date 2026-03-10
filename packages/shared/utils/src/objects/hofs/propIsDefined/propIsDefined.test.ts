import { describe, expect, it } from "vitest";
import { propIsDefined } from "./propIsDefined.ts";

describe("propIsDefined", () => {
  it("returns true when the property is defined", () => {
    type Item = { name?: string };
    const hasName = propIsDefined<Item, "name">("name");

    expect(hasName({ name: "Alice" })).toBe(true);
  });

  it("returns false when the property is undefined", () => {
    type Item = { name?: string };
    const hasName = propIsDefined<Item, "name">("name");

    expect(hasName({ name: undefined })).toBe(false);
    expect(hasName({})).toBe(false);
  });

  it("returns true for falsy but defined values", () => {
    type Item = { count?: number; label?: string };
    const hasCount = propIsDefined<Item, "count">("count");
    const hasLabel = propIsDefined<Item, "label">("label");

    expect(hasCount({ count: 0 })).toBe(true);
    expect(hasLabel({ label: "" })).toBe(true);
  });

  it("works as a filter predicate", () => {
    type Item = { id: number; tag?: string };
    const items: Item[] = [{ id: 1, tag: "a" }, { id: 2 }, { id: 3, tag: "b" }];

    const withTag = items.filter(propIsDefined<Item, "tag">("tag"));

    expect(withTag).toEqual([
      { id: 1, tag: "a" },
      { id: 3, tag: "b" },
    ]);
  });
});
