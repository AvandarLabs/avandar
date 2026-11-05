import { describe, expectTypeOf, it } from "vitest";
import type { EmptyObject } from "@utils/types/common.types.ts";
import type { Empty } from "@utils/types/Empty/Empty.ts";

describe("Type: Empty", () => {
  it("keeps null and undefined", () => {
    expectTypeOf<Empty<null>>().toEqualTypeOf<null>();
    expectTypeOf<Empty<undefined>>().toEqualTypeOf<undefined>();
    expectTypeOf<Empty<string | null | undefined>>().toEqualTypeOf<
      "" | null | undefined
    >();
  });

  it("narrows a wide string to the empty string", () => {
    expectTypeOf<Empty<string>>().toEqualTypeOf<"">();
  });

  it("keeps only the empty string of a literal union", () => {
    expectTypeOf<Empty<"" | "draft">>().toEqualTypeOf<"">();
    expectTypeOf<Empty<"draft" | "done">>().toBeNever();
  });

  it("narrows an array to a zero-length array", () => {
    expectTypeOf<Empty<string[]>>().toExtend<string[]>();
    expectTypeOf<Empty<string[]>["length"]>().toEqualTypeOf<0>();
    expectTypeOf<Empty<readonly number[]>>().toExtend<readonly number[]>();
    expectTypeOf<Empty<readonly number[]>["length"]>().toEqualTypeOf<0>();
  });

  it("keeps EmptyObject and drops objects with a required key", () => {
    expectTypeOf<Empty<EmptyObject>>().toEqualTypeOf<EmptyObject>();
    expectTypeOf<Empty<{ id: string }>>().toBeNever();
    expectTypeOf<
      Empty<{ column: string } | EmptyObject>
    >().toEqualTypeOf<EmptyObject>();
  });

  it("narrows an object with all optional keys to EmptyObject", () => {
    expectTypeOf<Empty<{ label?: string }>>().toExtend<EmptyObject>();
    expectTypeOf<Empty<{ label?: string }>>().not.toBeNever();
  });

  it("narrows a record to EmptyObject without collapsing to never", () => {
    expectTypeOf<Empty<Record<string, number>>>().not.toBeNever();
    expectTypeOf<Empty<Record<string, number>>>().toExtend<EmptyObject>();
  });

  it("maps numbers and booleans to never", () => {
    expectTypeOf<Empty<number>>().toBeNever();
    expectTypeOf<Empty<boolean>>().toBeNever();
  });

  it("returns unknown unchanged", () => {
    expectTypeOf<Empty<unknown>>().toEqualTypeOf<unknown>();
  });
});
