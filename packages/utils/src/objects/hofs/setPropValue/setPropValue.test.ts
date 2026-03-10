import { describe, expect, it } from "vitest";
import { setPropValue } from "./setPropValue.ts";

describe("setPropValue", () => {
  it("returns a function that sets a top-level key", () => {
    type Item = { name: string; age: number };
    const setAge = setPropValue<Item, "age", number>(
      "age",
      99,
    );

    const result = setAge({ name: "Alice", age: 30 });

    expect(result).toEqual({ name: "Alice", age: 99 });
  });

  it("does not mutate the original object", () => {
    type Item = { a: number; b: number };
    const setA = setPropValue<Item, "a", number>("a", 10);
    const input: Item = { a: 1, b: 2 };
    const copy = { ...input };

    setA(input);

    expect(input).toEqual(copy);
  });

  it("sets nested values via dot notation", () => {
    type Obj = { meta: { color: string } };
    const setColor = setPropValue<
      Obj,
      "meta.color",
      string
    >("meta.color", "blue");

    const result = setColor({
      meta: { color: "red" },
    });

    expect(result).toEqual({
      meta: { color: "blue" },
    });
  });

  it("works as a mapper", () => {
    type Item = { id: number; active: boolean };
    const items: Item[] = [
      { id: 1, active: true },
      { id: 2, active: true },
    ];

    const result = items.map(
      setPropValue<Item, "active", boolean>(
        "active",
        false,
      ),
    );

    expect(result).toEqual([
      { id: 1, active: false },
      { id: 2, active: false },
    ]);
  });
});
