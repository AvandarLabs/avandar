import { valEq } from "@utils/guards/hofs/valEq.ts";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("valEq", () => {
  it("keeps only the values equal to the given value", () => {
    expect(["a", "", "b"].filter(valEq(""))).toEqual([""]);
  });

  it("narrows to the literal when the guard is stored before use", () => {
    const isBlank = valEq("");
    const status = "" as "" | "draft";

    if (isBlank(status)) {
      expectTypeOf(status).toEqualTypeOf<"">();
    } else {
      expectTypeOf(status).toEqualTypeOf<"draft">();
    }
  });

  it("narrows a literal union inside filter", () => {
    const statuses = ["", "draft"] as Array<"" | "draft">;

    expectTypeOf(statuses.filter(valEq(""))).toEqualTypeOf<Array<"">>();
  });
});
