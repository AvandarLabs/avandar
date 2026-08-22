import type { EmptyObject, UnknownObject } from "@utils/types/common.types.ts";
import type { IsObjectWithShape } from "@utils/types/IsObjectWithShape/IsObjectWithShape.types.ts";

import { describe, expectTypeOf, it } from "vitest";

const TRUE = true as const;
const FALSE = false as const;

describe("Type: IsObjectWithShape", () => {
  it("returns true for an object with a string keyed shape", () => {
    expectTypeOf(TRUE).toEqualTypeOf<IsObjectWithShape<{ a: string }>>();
    expectTypeOf(TRUE).toEqualTypeOf<
      IsObjectWithShape<{ a: string; b: number }>
    >();
    expectTypeOf(TRUE).toEqualTypeOf<IsObjectWithShape<EmptyObject>>();
  });
  it("returns false for an object with a Record or indexed shape", () => {
    expectTypeOf(FALSE).toEqualTypeOf<
      IsObjectWithShape<{ [key: string]: unknown }>
    >();
    expectTypeOf(FALSE).toEqualTypeOf<
      IsObjectWithShape<{ [key: number]: unknown }>
    >();
    expectTypeOf(FALSE).toEqualTypeOf<
      IsObjectWithShape<{ [key: number | string]: unknown }>
    >();
    expectTypeOf(FALSE).toEqualTypeOf<IsObjectWithShape<UnknownObject>>();
    expectTypeOf(FALSE).toEqualTypeOf<
      IsObjectWithShape<Record<string, unknown>>
    >();
    expectTypeOf(FALSE).toEqualTypeOf<
      IsObjectWithShape<Record<number, unknown>>
    >();
    expectTypeOf(FALSE).toEqualTypeOf<
      IsObjectWithShape<Record<symbol, unknown>>
    >();
    expectTypeOf(FALSE).toEqualTypeOf<
      IsObjectWithShape<Record<number | string, unknown>>
    >();
    expectTypeOf(FALSE).toEqualTypeOf<
      IsObjectWithShape<Record<PropertyKey, unknown>>
    >();
  });
});
