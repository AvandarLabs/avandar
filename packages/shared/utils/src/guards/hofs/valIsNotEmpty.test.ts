import { valIsNotEmpty } from "@utils/guards/hofs/valIsNotEmpty.ts";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { EmptyObject } from "@utils/types/common.types.ts";

describe("valIsNotEmpty", () => {
  it("returns a guard that is false for empty values", () => {
    const check = valIsNotEmpty();
    expect([
      check(null),
      check(undefined),
      check(""),
      check([]),
      check({}),
    ]).toEqual([false, false, false, false, false]);
  });

  it("returns a guard that is true for non-empty values", () => {
    const check = valIsNotEmpty();
    expect([
      check(" "),
      check([undefined]),
      check({ a: 1 }),
      check(0),
      check(false),
    ]).toEqual([true, true, true, true, true]);
  });

  it("filters a literal union and drops the empty string from its type", () => {
    const statuses = ["", "draft", "", "done"] as Array<"" | "draft" | "done">;
    const result = statuses.filter(valIsNotEmpty());

    expect(result).toEqual(["draft", "done"]);
    expectTypeOf(result).toEqualTypeOf<Array<"draft" | "done">>();
  });

  it("filters nullish values and removes them from the type", () => {
    const names = ["a", undefined, null, ""] as Array<
      "a" | "" | null | undefined
    >;
    const result = names.filter(valIsNotEmpty());

    expect(result).toEqual(["a"]);
    expectTypeOf(result).toEqualTypeOf<Array<"a">>();
  });

  it("filters an object union and removes EmptyObject from the type", () => {
    const filters = [{ column: "a" }, {}] as Array<
      { column: string } | EmptyObject
    >;
    const result = filters.filter(valIsNotEmpty());

    expect(result).toEqual([{ column: "a" }]);
    expectTypeOf(result).toEqualTypeOf<Array<{ column: string }>>();
  });

  it("filters arrays and types the first element as defined", () => {
    const lists = [[], ["a"], []] as string[][];
    const result = lists.filter(valIsNotEmpty());

    expect(result).toEqual([["a"]]);
    expectTypeOf(result[0]?.[0]).toEqualTypeOf<string | undefined>();
    expectTypeOf(result).items.toExtend<string[]>();
  });

  it("filters a nullable list of arrays", () => {
    const lists = [[], ["a"], null] as Array<string[] | null>;
    const result = lists.filter(valIsNotEmpty());

    expect(result).toEqual([["a"]]);
    expectTypeOf(result).items.not.toBeNullable();
  });

  it("keeps numbers and booleans, including falsy ones", () => {
    const totals = [0, 1, undefined] as Array<number | undefined>;
    const result = totals.filter(valIsNotEmpty());

    expect(result).toEqual([0, 1]);
    expectTypeOf(result).toEqualTypeOf<number[]>();
  });
});
