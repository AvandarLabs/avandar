import { valIsNotEmpty } from "@utils/guards/valIsNotEmpty/valIsNotEmpty.ts";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { EmptyObject, UUID } from "@utils/types/common.types.ts";

describe("valIsNotEmpty", () => {
  it("returns false for empty strings, arrays, and plain objects", () => {
    expect([valIsNotEmpty(""), valIsNotEmpty([]), valIsNotEmpty({})]).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("returns false for null and undefined", () => {
    expect([valIsNotEmpty(null), valIsNotEmpty(undefined)]).toEqual([
      false,
      false,
    ]);
  });

  it("returns true for non-empty strings, arrays, and plain objects", () => {
    expect([
      valIsNotEmpty(" "),
      valIsNotEmpty([undefined]),
      valIsNotEmpty({ a: undefined }),
    ]).toEqual([true, true, true]);
  });

  it("returns true for values with no notion of emptiness", () => {
    expect([
      valIsNotEmpty(0),
      valIsNotEmpty(false),
      valIsNotEmpty(new Date(0)),
    ]).toEqual([true, true, true]);
  });

  it("removes only the empty string from a literal union", () => {
    const status = "" as "" | "draft" | "done";
    if (valIsNotEmpty(status)) {
      expectTypeOf(status).toEqualTypeOf<"draft" | "done">();
    } else {
      expectTypeOf(status).toEqualTypeOf<"">();
    }
  });

  it("brands a wide string and leaves the else branch a string", () => {
    const name = "" as string;
    if (valIsNotEmpty(name)) {
      expectTypeOf(name).toExtend<string>();
      expectTypeOf(name).not.toEqualTypeOf<string>();
    } else {
      expectTypeOf(name).toEqualTypeOf<string>();
    }
  });

  it("keeps a branded string usable instead of collapsing it to never", () => {
    const workspaceId = "" as UUID<"Workspace">;
    if (valIsNotEmpty(workspaceId)) {
      expectTypeOf(workspaceId).not.toBeNever();
      expectTypeOf(workspaceId).toExtend<UUID<"Workspace">>();
    }
  });

  it("types the first element of a non-empty array as defined", () => {
    const names = [] as string[];
    if (valIsNotEmpty(names)) {
      expectTypeOf(names[0]).toEqualTypeOf<string>();
      expectTypeOf(names).toExtend<string[]>();
    } else {
      expectTypeOf(names).toEqualTypeOf<string[]>();
    }
  });

  it("keeps a readonly array readonly", () => {
    const counts = [] as readonly number[];
    if (valIsNotEmpty(counts)) {
      expectTypeOf(counts[0]).toEqualTypeOf<number>();
      expectTypeOf(counts).toExtend<readonly number[]>();
      expectTypeOf(counts).not.toExtend<number[]>();
    }
  });

  it("removes null and undefined", () => {
    const names = undefined as string[] | null | undefined;
    if (valIsNotEmpty(names)) {
      expectTypeOf(names[0]).toEqualTypeOf<string>();
    }
  });

  it("brands a record and leaves the else branch a record", () => {
    const totals = {} as Record<string, number>;
    if (valIsNotEmpty(totals)) {
      expectTypeOf(totals).toExtend<Record<string, number>>();
      expectTypeOf(totals).not.toBeNever();
    } else {
      expectTypeOf(totals).toEqualTypeOf<Record<string, number>>();
    }
  });

  it("brands a numeric-keyed record instead of collapsing it to never", () => {
    const rows = {} as Record<number, string>;
    if (valIsNotEmpty(rows)) {
      expectTypeOf(rows).not.toBeNever();
    }
  });

  it("brands an object whose keys are all optional", () => {
    const options = {} as { label?: string };
    if (valIsNotEmpty(options)) {
      expectTypeOf(options).toExtend<{ label?: string }>();
      expectTypeOf(options).not.toBeNever();
    } else {
      expectTypeOf(options).toEqualTypeOf<{ label?: string }>();
    }
  });

  it("removes EmptyObject from a union with a non-empty object", () => {
    const filters = {} as { column: string } | EmptyObject;
    if (valIsNotEmpty(filters)) {
      expectTypeOf(filters).toEqualTypeOf<{ column: string }>();
    } else {
      expectTypeOf(filters).toEqualTypeOf<EmptyObject>();
    }
  });

  it("leaves an object with a required key unchanged", () => {
    const user = { id: "u1" } as { id: string };
    if (valIsNotEmpty(user)) {
      expectTypeOf(user).toEqualTypeOf<{ id: string }>();
    }
  });

  it("narrows unknown to a non-nullish value", () => {
    const value = undefined as unknown;
    if (valIsNotEmpty(value)) {
      expectTypeOf(value).toEqualTypeOf<NonNullable<unknown>>();
    }
  });

  it("filters an array down to its non-empty items", () => {
    const statuses = ["", "draft"] as Array<"" | "draft">;
    const lists = [[], ["a"]] as string[][];
    const nonEmptyLists = lists.filter(valIsNotEmpty);

    expect(statuses.filter(valIsNotEmpty)).toEqual(["draft"]);
    expect(nonEmptyLists).toEqual([["a"]]);
    expectTypeOf(statuses.filter(valIsNotEmpty)).toEqualTypeOf<
      Array<"draft">
    >();
    expectTypeOf(nonEmptyLists[0]?.[0]).toEqualTypeOf<string | undefined>();
    expectTypeOf(
      nonEmptyLists.map(([first]) => {
        return first;
      }),
    ).toEqualTypeOf<string[]>();
  });
});
