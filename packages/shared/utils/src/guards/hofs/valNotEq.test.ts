import { valNotEq } from "@utils/guards/hofs/valNotEq.ts";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("valNotEq", () => {
  it("drops the values equal to the given value", () => {
    expect(["a", "", "b"].filter(valNotEq(""))).toEqual(["a", "b"]);
  });

  it("keeps a string array typed as strings when excluding a literal", () => {
    const lines: string[] = ["a", ""];

    expectTypeOf(lines.filter(valNotEq(""))).toEqualTypeOf<string[]>();
  });

  it("removes only the given literal from a literal union", () => {
    const aggregations: Array<"none" | "sum" | "count"> = ["none", "sum"];

    expectTypeOf(aggregations.filter(valNotEq("none"))).toEqualTypeOf<
      Array<"sum" | "count">
    >();
  });
});
