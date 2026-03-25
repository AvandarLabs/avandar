import { describe, expect, it } from "vitest";
import { propPasses } from "@utils/objects/hofs/propPasses/propPasses.ts";

describe("propPasses", () => {
  it("returns true when the predicate passes", () => {
    type Item = { age: number };
    const isAdult = propPasses<Item, "age", number>("age", (v): v is number => {
      return v >= 18;
    });

    expect(isAdult({ age: 21 })).toBe(true);
  });

  it("returns false when the predicate fails", () => {
    type Item = { age: number };
    const isAdult = propPasses<Item, "age", number>("age", (v): v is number => {
      return v >= 18;
    });

    expect(isAdult({ age: 12 })).toBe(false);
  });

  it("works as a filter predicate", () => {
    type Item = { name: string; score: number };
    const items: Item[] = [
      { name: "Alice", score: 90 },
      { name: "Bob", score: 40 },
      { name: "Carol", score: 75 },
    ];

    const passing = items.filter(
      propPasses<Item, "score", number>("score", (v): v is number => {
        return v >= 60;
      }),
    );

    expect(passing).toEqual([
      { name: "Alice", score: 90 },
      { name: "Carol", score: 75 },
    ]);
  });

  it("works with a type guard predicate", () => {
    type Item = { value: string | number };
    const hasStringValue = propPasses<Item, "value", string>(
      "value",
      (v): v is string => {
        return typeof v === "string";
      },
    );

    expect(hasStringValue({ value: "hi" })).toBe(true);
    expect(hasStringValue({ value: 42 })).toBe(false);
  });
});
