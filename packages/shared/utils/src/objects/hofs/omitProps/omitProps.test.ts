import { describe, expect, it } from "vitest";
import { omitProps } from "./omitProps.ts";

describe("omitProps", () => {
  it("returns a function that omits a single key", () => {
    type Item = { a: number; b: number; c: number };
    const dropB = omitProps<Item, "b">("b");

    expect(dropB({ a: 1, b: 2, c: 3 })).toEqual({
      a: 1,
      c: 3,
    });
  });

  it("returns a function that omits multiple keys", () => {
    type Item = { a: number; b: number; c: number };
    const dropAC = omitProps<Item, "a" | "c">(["a", "c"]);

    expect(dropAC({ a: 1, b: 2, c: 3 })).toEqual({
      b: 2,
    });
  });

  it("works as a mapper", () => {
    type Item = { id: number; secret: string };
    const items: Item[] = [
      { id: 1, secret: "x" },
      { id: 2, secret: "y" },
    ];

    const result = items.map(
      omitProps<Item, "secret">("secret"),
    );

    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
