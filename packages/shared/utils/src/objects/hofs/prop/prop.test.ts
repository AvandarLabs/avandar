import { describe, expect, it } from "vitest";
import { prop } from "./prop.ts";

describe("prop", () => {
  it("returns a function that gets a top-level key", () => {
    type Item = { name: string; age: number };
    const getName = prop<Item, "name", string>("name");

    expect(getName({ name: "Alice", age: 30 })).toBe("Alice");
  });

  it("works as a mapper for arrays", () => {
    type Item = { id: number; label: string };
    const items: Item[] = [
      { id: 1, label: "a" },
      { id: 2, label: "b" },
    ];

    const ids = items.map(prop<Item, "id", number>("id"));

    expect(ids).toEqual([1, 2]);
  });

  it("accesses nested values via dot notation", () => {
    type Obj = { meta: { color: string } };
    const getColor = prop<Obj, "meta.color", string>("meta.color");

    expect(getColor({ meta: { color: "red" } })).toBe("red");
  });
});
