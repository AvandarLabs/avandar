import { describe, expect, it } from "vitest";
import { excludeNullsInProps } from "./excludeNullsInProps.ts";

describe("excludeNullsInProps", () => {
  it("returns a function that removes nulls from specified keys", () => {
    type Item = {
      a: number | null;
      b: string | null;
      c: number;
    };
    const clean = excludeNullsInProps<Item, "a" | "b">(["a", "b"]);

    const result = clean({ a: null, b: null, c: 5 });

    expect(result).toEqual({ c: 5 });
  });

  it("preserves non-null values", () => {
    type Item = {
      a: number | null;
      b: string;
    };
    const clean = excludeNullsInProps<Item, "a">("a");

    const result = clean({ a: 1, b: "hi" });

    expect(result).toEqual({ a: 1, b: "hi" });
  });

  it("works as a mapper", () => {
    type Item = {
      id: number;
      tag: string | null;
    };
    const items: Item[] = [
      { id: 1, tag: "x" },
      { id: 2, tag: null },
    ];

    const result = items.map(excludeNullsInProps<Item, "tag">("tag"));

    expect(result).toEqual([{ id: 1, tag: "x" }, { id: 2 }]);
  });
});
