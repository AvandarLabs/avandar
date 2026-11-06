import { isEmpty } from "@utils/guards/isEmpty/isEmpty.ts";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { EmptyObject } from "@utils/types/common.types.ts";

describe("isEmpty", () => {
  it("returns true for null, undefined, and empty strings, arrays, and plain objects", () => {
    expect([
      isEmpty(null),
      isEmpty(undefined),
      isEmpty(""),
      isEmpty([]),
      isEmpty({}),
    ]).toEqual([true, true, true, true, true]);
  });

  it("returns false for non-empty strings, arrays, and plain objects", () => {
    expect([
      isEmpty(" "),
      isEmpty([undefined]),
      isEmpty({ a: undefined }),
    ]).toEqual([false, false, false]);
  });

  it("returns false for values with no notion of emptiness", () => {
    expect([isEmpty(0), isEmpty(false), isEmpty(new Date(0))]).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("treats sets and maps with no entries as empty", () => {
    expect([
      isEmpty(new Set()),
      isEmpty(new Map()),
      isEmpty(new Set([1])),
      isEmpty(new Map([["a", 1]])),
    ]).toEqual([true, true, false, false]);
  });

  it("keeps a set and a map usable in both branches", () => {
    const ids = new Set<number>();
    if (isEmpty(ids)) {
      expectTypeOf(ids).not.toBeNever();
      expectTypeOf(ids).toExtend<Set<number>>();
    } else {
      expectTypeOf(ids).toEqualTypeOf<Set<number>>();
    }
    const totals = new Map<string, number>();
    if (isEmpty(totals)) {
      expectTypeOf(totals).not.toBeNever();
      expectTypeOf(totals).toExtend<Map<string, number>>();
    } else {
      expectTypeOf(totals).toEqualTypeOf<Map<string, number>>();
    }
  });

  it("narrows a wide string to the empty string and leaves the else branch a string", () => {
    const name = "" as string;
    if (isEmpty(name)) {
      expectTypeOf(name).toEqualTypeOf<"">();
    } else {
      expectTypeOf(name).toEqualTypeOf<string>();
    }
  });

  it("splits a literal union into the empty string and the rest", () => {
    const status = "" as "" | "draft";
    if (isEmpty(status)) {
      expectTypeOf(status).toEqualTypeOf<"">();
    } else {
      expectTypeOf(status).toEqualTypeOf<"draft">();
    }
  });

  it("narrows an array to length 0 and removes undefined from the else branch", () => {
    const names = undefined as string[] | undefined;
    if (isEmpty(names)) {
      expectTypeOf(names?.length).toEqualTypeOf<0 | undefined>();
    } else {
      expectTypeOf(names).toEqualTypeOf<string[]>();
    }
  });

  it("keeps a record usable in both branches", () => {
    const totals = {} as Record<string, number>;
    if (isEmpty(totals)) {
      expectTypeOf(totals).not.toBeNever();
      expectTypeOf(totals).not.toEqualTypeOf<Record<string, number>>();
    } else {
      expectTypeOf(totals).toEqualTypeOf<Record<string, number>>();
    }
  });

  it("splits an object union into EmptyObject and the non-empty object", () => {
    const filters = {} as { column: string } | EmptyObject;
    if (isEmpty(filters)) {
      expectTypeOf(filters).toEqualTypeOf<EmptyObject>();
    } else {
      expectTypeOf(filters).toEqualTypeOf<{ column: string }>();
    }
  });

  it("narrows an object with a required key to never", () => {
    const user = { id: "u1" };
    if (isEmpty(user)) {
      expectTypeOf(user).toBeNever();
    } else {
      expectTypeOf(user).toEqualTypeOf<{ id: string }>();
    }
  });

  it("narrows numbers and booleans to never", () => {
    const total = 0 as number;
    const isActive = false as boolean;
    if (isEmpty(total)) {
      expectTypeOf(total).toBeNever();
    } else {
      expectTypeOf(total).toEqualTypeOf<number>();
    }
    if (isEmpty(isActive)) {
      expectTypeOf(isActive).toBeNever();
    } else {
      expectTypeOf(isActive).toEqualTypeOf<boolean>();
    }
  });

  it("filters an array down to its empty items", () => {
    const statuses = ["", "draft"] as Array<"" | "draft">;

    expect(statuses.filter(isEmpty)).toEqual([""]);
    expectTypeOf(statuses.filter(isEmpty)).toEqualTypeOf<Array<"">>();
  });
});
