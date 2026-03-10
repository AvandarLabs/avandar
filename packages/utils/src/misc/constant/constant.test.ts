import { describe, expect, it } from "vitest";
import { constant } from "./constant.ts";

describe("constant", () => {
  it("returns a function that always returns the same value", () => {
    const value: unknown = [];
    const fn = constant(value);
    expect(fn()).toBe(value);

    // and make sure it is still the same after successive calls
    expect(fn()).toBe(value);
  });
});
