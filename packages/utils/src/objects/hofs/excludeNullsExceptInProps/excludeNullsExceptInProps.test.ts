import { describe, expect, it } from "vitest";
import { excludeNullsExceptInProps } from "./excludeNullsExceptInProps.ts";

describe("excludeNullsExceptInProps", () => {
  it("keeps null for the specified key and removes other nulls", () => {
    type Item = {
      a: number | null;
      b: string | null;
      c: number;
    };
    const clean = excludeNullsExceptInProps<Item, "a">(
      "a",
    );

    const result = clean({ a: null, b: null, c: 5 });

    expect(result).toEqual({ a: null, c: 5 });
  });

  it("preserves non-null values everywhere", () => {
    type Item = {
      a: number | null;
      b: string | null;
      c: number;
    };
    const clean = excludeNullsExceptInProps<Item, "a">(
      "a",
    );

    const result = clean({ a: 1, b: "hi", c: 5 });

    expect(result).toEqual({ a: 1, b: "hi", c: 5 });
  });

  it("works as a mapper", () => {
    type Item = {
      id: number;
      tag: string | null;
      note: string | null;
    };
    const items: Item[] = [
      { id: 1, tag: null, note: null },
      { id: 2, tag: "x", note: null },
    ];

    const result = items.map(
      excludeNullsExceptInProps<Item, "tag">("tag"),
    );

    expect(result).toEqual([
      { id: 1, tag: null },
      { id: 2, tag: "x" },
    ]);
  });
});
