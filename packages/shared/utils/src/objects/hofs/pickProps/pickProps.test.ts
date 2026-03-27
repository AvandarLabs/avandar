import { describe, expect, it } from "vitest";
import { pickProps } from "@utils/objects/hofs/pickProps/pickProps.ts";

describe("pickProps", () => {
  it("returns a function that picks a single key", () => {
    type Item = { a: number; b: number; c: number };
    const onlyB = pickProps<Item, "b">("b");

    expect(onlyB({ a: 1, b: 2, c: 3 })).toEqual({
      b: 2,
    });
  });

  it("returns a function that picks multiple keys", () => {
    type Item = { a: number; b: number; c: number };
    const onlyAC = pickProps<Item, "a" | "c">(["a", "c"]);

    expect(onlyAC({ a: 1, b: 2, c: 3 })).toEqual({
      a: 1,
      c: 3,
    });
  });

  it("works as a mapper", () => {
    type Item = { id: number; name: string; age: number };
    const items: Item[] = [
      { id: 1, name: "Alice", age: 30 },
      { id: 2, name: "Bob", age: 25 },
    ];

    const result = items.map(
      pickProps<Item, "id" | "name">(["id", "name"]),
    );

    expect(result).toEqual([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
  });
});
