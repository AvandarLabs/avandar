import { describe, expect, it } from "vitest";
import { propIsInArray } from "@utils/objects/hofs/propIsInArray/propIsInArray.ts";

describe("propIsInArray", () => {
  it("returns true when the property is in the array", () => {
    type Item = { status: string };
    const isValid = propIsInArray<Item, "status", string>("status", [
      "active",
      "pending",
    ]);

    expect(isValid({ status: "active" })).toBe(true);
    expect(isValid({ status: "pending" })).toBe(true);
  });

  it("returns false when the property is not in the array", () => {
    type Item = { status: string };
    const isValid = propIsInArray<Item, "status", string>("status", [
      "active",
      "pending",
    ]);

    expect(isValid({ status: "closed" })).toBe(false);
  });

  it("works as a filter predicate", () => {
    type Item = { role: string; name: string };
    const items: Item[] = [
      { role: "admin", name: "Alice" },
      { role: "user", name: "Bob" },
      { role: "editor", name: "Carol" },
      { role: "admin", name: "Dave" },
    ];

    const adminsOrEditors = items.filter(
      propIsInArray<Item, "role", string>("role", ["admin", "editor"]),
    );

    expect(adminsOrEditors).toEqual([
      { role: "admin", name: "Alice" },
      { role: "editor", name: "Carol" },
      { role: "admin", name: "Dave" },
    ]);
  });
});
