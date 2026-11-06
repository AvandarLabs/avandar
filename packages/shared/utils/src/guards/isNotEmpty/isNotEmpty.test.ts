import { isNotEmpty } from "@utils/guards/isNotEmpty/isNotEmpty.ts";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { EmptyObject, UUID } from "@utils/types/common.types.ts";

describe("isNotEmpty", () => {
  it("returns false for empty strings, arrays, and plain objects", () => {
    expect([isNotEmpty(""), isNotEmpty([]), isNotEmpty({})]).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("returns false for null and undefined", () => {
    expect([isNotEmpty(null), isNotEmpty(undefined)]).toEqual([false, false]);
  });

  it("returns true for non-empty strings, arrays, and plain objects", () => {
    expect([
      isNotEmpty(" "),
      isNotEmpty([undefined]),
      isNotEmpty({ a: undefined }),
    ]).toEqual([true, true, true]);
  });

  it("returns true for values with no notion of emptiness", () => {
    expect([isNotEmpty(0), isNotEmpty(false), isNotEmpty(new Date(0))]).toEqual(
      [true, true, true],
    );
  });

  it("treats sets and maps with no entries as empty", () => {
    expect([
      isNotEmpty(new Set()),
      isNotEmpty(new Map()),
      isNotEmpty(new Set([1])),
      isNotEmpty(new Map([["a", 1]])),
    ]).toEqual([false, false, true, true]);
  });

  it("keeps a set and a map usable in both branches", () => {
    const ids = new Set<number>();
    if (isNotEmpty(ids)) {
      expectTypeOf(ids).not.toBeNever();
      expectTypeOf(ids).toExtend<Set<number>>();
    } else {
      expectTypeOf(ids).toEqualTypeOf<Set<number>>();
    }
    const totals = new Map<string, number>();
    if (isNotEmpty(totals)) {
      expectTypeOf(totals).not.toBeNever();
      expectTypeOf(totals).toExtend<Map<string, number>>();
    } else {
      expectTypeOf(totals).toEqualTypeOf<Map<string, number>>();
    }
  });

  it("removes only the empty string from a literal union", () => {
    const status = "" as "" | "draft" | "done";
    if (isNotEmpty(status)) {
      expectTypeOf(status).toEqualTypeOf<"draft" | "done">();
    } else {
      expectTypeOf(status).toEqualTypeOf<"">();
    }
  });

  it("brands a wide string and leaves the else branch a string", () => {
    const name = "" as string;
    if (isNotEmpty(name)) {
      expectTypeOf(name).toExtend<string>();
      expectTypeOf(name).not.toEqualTypeOf<string>();
    } else {
      expectTypeOf(name).toEqualTypeOf<string>();
    }
  });

  it("keeps a branded string usable instead of collapsing it to never", () => {
    const workspaceId = "" as UUID<"Workspace">;
    if (isNotEmpty(workspaceId)) {
      expectTypeOf(workspaceId).not.toBeNever();
      expectTypeOf(workspaceId).toExtend<UUID<"Workspace">>();
    }
  });

  it("types the first element of a non-empty array as defined", () => {
    const names = [] as string[];
    if (isNotEmpty(names)) {
      expectTypeOf(names[0]).toEqualTypeOf<string>();
      expectTypeOf(names).toExtend<string[]>();
    } else {
      expectTypeOf(names).toEqualTypeOf<string[]>();
    }
  });

  it("keeps a readonly array readonly", () => {
    const counts = [] as readonly number[];
    if (isNotEmpty(counts)) {
      expectTypeOf(counts[0]).toEqualTypeOf<number>();
      expectTypeOf(counts).toExtend<readonly number[]>();
      expectTypeOf(counts).not.toExtend<number[]>();
    }
  });

  it("removes null and undefined", () => {
    const names = undefined as string[] | null | undefined;
    if (isNotEmpty(names)) {
      expectTypeOf(names[0]).toEqualTypeOf<string>();
    }
  });

  it("brands a record and leaves the else branch a record", () => {
    const totals = {} as Record<string, number>;
    if (isNotEmpty(totals)) {
      expectTypeOf(totals).toExtend<Record<string, number>>();
      expectTypeOf(totals).not.toBeNever();
    } else {
      expectTypeOf(totals).toEqualTypeOf<Record<string, number>>();
    }
  });

  it("brands a numeric-keyed record instead of collapsing it to never", () => {
    const rows = {} as Record<number, string>;
    if (isNotEmpty(rows)) {
      expectTypeOf(rows).not.toBeNever();
    } else {
      expectTypeOf(rows).toEqualTypeOf<Record<number, string>>();
    }
  });

  it("brands an object whose keys are all optional", () => {
    const options = {} as { label?: string };
    if (isNotEmpty(options)) {
      expectTypeOf(options).toExtend<{ label?: string }>();
      expectTypeOf(options).not.toBeNever();
    } else {
      expectTypeOf(options).toEqualTypeOf<{ label?: string }>();
    }
  });

  it("removes EmptyObject from a union with a non-empty object", () => {
    const filters = {} as { column: string } | EmptyObject;
    if (isNotEmpty(filters)) {
      expectTypeOf(filters).toEqualTypeOf<{ column: string }>();
    } else {
      expectTypeOf(filters).toEqualTypeOf<EmptyObject>();
    }
  });

  it("leaves an object with a required key unchanged", () => {
    const user = { id: "u1" };
    if (isNotEmpty(user)) {
      expectTypeOf(user).toEqualTypeOf<{ id: string }>();
    }
  });

  it("brands object and {} instead of collapsing them to never", () => {
    const config = {} as object;
    const settings = {} as NonNullable<unknown>;
    if (isNotEmpty(config)) {
      expectTypeOf(config).toExtend<object>();
    } else {
      expectTypeOf(config).toEqualTypeOf<object>();
    }
    if (isNotEmpty(settings)) {
      expectTypeOf(settings).toExtend<NonNullable<unknown>>();
    } else {
      expectTypeOf(settings).toEqualTypeOf<NonNullable<unknown>>();
    }
  });

  it("leaves numbers and booleans unbranded", () => {
    const total = 0 as number | undefined;
    const isActive = false as boolean | null;
    if (isNotEmpty(total)) {
      expectTypeOf(total).toEqualTypeOf<number>();
    }
    if (isNotEmpty(isActive)) {
      expectTypeOf(isActive).toEqualTypeOf<boolean>();
    }
  });

  it("narrows unknown to a non-nullish value", () => {
    const value = undefined as unknown;
    if (isNotEmpty(value)) {
      expectTypeOf(value).toEqualTypeOf<NonNullable<unknown>>();
    }
  });

  it("filters an array down to its non-empty items", () => {
    const statuses = ["", "draft"] as Array<"" | "draft">;
    const lists = [[], ["a"]];
    const nonEmptyLists = lists.filter(isNotEmpty);

    expect(statuses.filter(isNotEmpty)).toEqual(["draft"]);
    expect(nonEmptyLists).toEqual([["a"]]);
    expectTypeOf(statuses.filter(isNotEmpty)).toEqualTypeOf<Array<"draft">>();
    expectTypeOf(
      nonEmptyLists.map(([firstItem]) => {
        return firstItem;
      }),
    ).toEqualTypeOf<string[]>();
  });
});
