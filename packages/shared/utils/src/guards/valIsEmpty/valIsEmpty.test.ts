import { valIsEmpty } from "@utils/guards/valIsEmpty/valIsEmpty.ts";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { EmptyObject } from "@utils/types/common.types.ts";

describe("valIsEmpty", () => {
  it("returns true for null, undefined, and empty strings, arrays, and plain objects", () => {
    expect([
      valIsEmpty(null),
      valIsEmpty(undefined),
      valIsEmpty(""),
      valIsEmpty([]),
      valIsEmpty({}),
    ]).toEqual([true, true, true, true, true]);
  });

  it("returns false for non-empty values and values with no notion of emptiness", () => {
    expect([
      valIsEmpty(" "),
      valIsEmpty([undefined]),
      valIsEmpty({ a: undefined }),
      valIsEmpty(0),
      valIsEmpty(false),
      valIsEmpty(new Date(0)),
    ]).toEqual([false, false, false, false, false, false]);
  });

  it("narrows a wide string to the empty string and leaves the else branch a string", () => {
    const name = "" as string;
    if (valIsEmpty(name)) {
      expectTypeOf(name).toEqualTypeOf<"">();
    } else {
      expectTypeOf(name).toEqualTypeOf<string>();
    }
  });

  it("splits a literal union into the empty string and the rest", () => {
    const status = "" as "" | "draft";
    if (valIsEmpty(status)) {
      expectTypeOf(status).toEqualTypeOf<"">();
    } else {
      expectTypeOf(status).toEqualTypeOf<"draft">();
    }
  });

  it("narrows an array to length 0 and removes undefined from the else branch", () => {
    const names = undefined as string[] | undefined;
    if (valIsEmpty(names)) {
      expectTypeOf(names?.length).toEqualTypeOf<0 | undefined>();
    } else {
      expectTypeOf(names).toEqualTypeOf<string[]>();
    }
  });

  it("keeps a record usable in both branches", () => {
    const totals = {} as Record<string, number>;
    if (valIsEmpty(totals)) {
      expectTypeOf(totals).not.toBeNever();
      expectTypeOf(totals).toExtend<EmptyObject>();
    } else {
      expectTypeOf(totals).toEqualTypeOf<Record<string, number>>();
    }
  });

  it("splits an object union into EmptyObject and the non-empty object", () => {
    const filters = {} as { column: string } | EmptyObject;
    if (valIsEmpty(filters)) {
      expectTypeOf(filters).toEqualTypeOf<EmptyObject>();
    } else {
      expectTypeOf(filters).toEqualTypeOf<{ column: string }>();
    }
  });

  it("narrows an object with a required key to never", () => {
    const user = { id: "u1" } as { id: string };
    if (valIsEmpty(user)) {
      expectTypeOf(user).toBeNever();
    } else {
      expectTypeOf(user).toEqualTypeOf<{ id: string }>();
    }
  });

  it("filters an array down to its empty items", () => {
    const statuses = ["", "draft"] as Array<"" | "draft">;

    expect(statuses.filter(valIsEmpty)).toEqual([""]);
    expectTypeOf(statuses.filter(valIsEmpty)).toEqualTypeOf<Array<"">>();
  });
});
