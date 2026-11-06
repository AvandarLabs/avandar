import { valIsEmpty } from "@utils/guards/hofs/valIsEmpty.ts";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { EmptyObject } from "@utils/types/common.types.ts";

describe("valIsEmpty", () => {
  it("returns a guard that is true for empty values", () => {
    const check = valIsEmpty();
    expect([
      check(null),
      check(undefined),
      check(""),
      check([]),
      check({}),
    ]).toEqual([true, true, true, true, true]);
  });

  it("returns a guard that is false for non-empty values", () => {
    const check = valIsEmpty();
    expect([
      check(" "),
      check([undefined]),
      check({ a: 1 }),
      check(0),
      check(false),
    ]).toEqual([false, false, false, false, false]);
  });

  it("filters a literal union down to the empty string", () => {
    const statuses = ["", "draft", "", "done"] as Array<"" | "draft" | "done">;
    const result = statuses.filter(valIsEmpty());

    expect(result).toEqual(["", ""]);
    expectTypeOf(result).toEqualTypeOf<Array<"">>();
  });

  it("filters nullish values and keeps the narrowed type", () => {
    const names = ["a", undefined, null, ""] as Array<
      "a" | "" | null | undefined
    >;
    const result = names.filter(valIsEmpty());

    expect(result).toEqual([undefined, null, ""]);
    expectTypeOf(result).toEqualTypeOf<Array<"" | null | undefined>>();
  });

  it("filters an object union down to EmptyObject", () => {
    const filters = [{ column: "a" }, {}] as Array<
      { column: string } | EmptyObject
    >;
    const result = filters.filter(valIsEmpty());

    expect(result).toEqual([{}]);
    expectTypeOf(result).toEqualTypeOf<EmptyObject[]>();
  });

  it("filters arrays down to the empty ones", () => {
    const lists = [[], ["a"], []] as string[][];
    const result = lists.filter(valIsEmpty());

    expect(result).toEqual([[], []]);
    expectTypeOf(result[0]?.length).toEqualTypeOf<0 | undefined>();
  });

  it("filters out everything for types that are never empty", () => {
    const totals = [0, 1] as number[];
    const result = totals.filter(valIsEmpty());

    expect(result).toEqual([]);
    expectTypeOf(result).toEqualTypeOf<never[]>();
  });
});
