import { describe, expectTypeOf, it } from "vitest";
import type { EmptyObject, UUID } from "@utils/types/common.types.ts";
import type { NonEmpty } from "@utils/types/NonEmpty/NonEmpty.ts";

describe("Type: NonEmpty", () => {
  it("removes null and undefined", () => {
    expectTypeOf<NonEmpty<null>>().toBeNever();
    expectTypeOf<NonEmpty<undefined>>().toBeNever();
    expectTypeOf<NonEmpty<number | null | undefined>>().toEqualTypeOf<number>();
  });

  it("removes only the empty string from a literal union", () => {
    expectTypeOf<NonEmpty<"" | "draft" | "done">>().toEqualTypeOf<
      "draft" | "done"
    >();
    expectTypeOf<NonEmpty<"">>().toBeNever();
  });

  it("brands a wide string", () => {
    expectTypeOf<NonEmpty<string>>().toExtend<string>();
    expectTypeOf<NonEmpty<string>>().not.toEqualTypeOf<string>();
    expectTypeOf<string>().not.toExtend<NonEmpty<string>>();
  });

  it("keeps a branded string usable instead of collapsing it to never", () => {
    expectTypeOf<NonEmpty<UUID<"Workspace">>>().not.toBeNever();
    expectTypeOf<NonEmpty<UUID<"Workspace">>>().toExtend<UUID<"Workspace">>();
  });

  it("guarantees the first element of an array", () => {
    expectTypeOf<NonEmpty<string[]>[0]>().toEqualTypeOf<string>();
    expectTypeOf<NonEmpty<string[]>>().toExtend<string[]>();
    expectTypeOf<
      NonEmpty<string[] | null | undefined>[0]
    >().toEqualTypeOf<string>();
  });

  it("keeps a readonly array readonly", () => {
    expectTypeOf<NonEmpty<readonly number[]>[0]>().toEqualTypeOf<number>();
    expectTypeOf<NonEmpty<readonly number[]>>().toExtend<readonly number[]>();
    expectTypeOf<NonEmpty<readonly number[]>>().not.toExtend<number[]>();
  });

  it("brands a record instead of collapsing it to never", () => {
    expectTypeOf<NonEmpty<Record<string, number>>>().not.toBeNever();
    expectTypeOf<NonEmpty<Record<string, number>>>().toExtend<
      Record<string, number>
    >();
    expectTypeOf<NonEmpty<Record<number, string>>>().not.toBeNever();
  });

  it("brands an object whose keys are all optional", () => {
    expectTypeOf<NonEmpty<{ label?: string }>>().not.toBeNever();
    expectTypeOf<NonEmpty<{ label?: string }>>().toExtend<{
      label?: string;
    }>();
  });

  it("brands object and {} instead of collapsing them to never", () => {
    expectTypeOf<NonEmpty<object>>().not.toBeNever();
    expectTypeOf<NonEmpty<object>>().toExtend<object>();
    expectTypeOf<NonEmpty<NonNullable<unknown>>>().not.toBeNever();
  });

  it("removes EmptyObject from a union with a non-empty object", () => {
    expectTypeOf<NonEmpty<{ column: string } | EmptyObject>>().toEqualTypeOf<{
      column: string;
    }>();
    expectTypeOf<NonEmpty<EmptyObject>>().toBeNever();
  });

  it("leaves an object with a required key unchanged", () => {
    expectTypeOf<NonEmpty<{ id: string }>>().toEqualTypeOf<{ id: string }>();
  });

  it("leaves numbers and booleans unchanged", () => {
    expectTypeOf<NonEmpty<number>>().toEqualTypeOf<number>();
    expectTypeOf<NonEmpty<boolean>>().toEqualTypeOf<boolean>();
  });

  it("turns unknown into a non-nullish value", () => {
    expectTypeOf<NonEmpty<unknown>>().toEqualTypeOf<NonNullable<unknown>>();
  });
});
