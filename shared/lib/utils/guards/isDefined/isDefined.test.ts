import { describe, expect, it } from "vitest";
import { isDefined } from "./isDefined.ts";

describe("isDefined", () => {
  it("returns false for undefined", () => {
    expect(isDefined(undefined)).toBe(false);
  });

  it("returns true for literally anything else", () => {
    expect(isDefined(null)).toBe(true);
    expect(isDefined("foo")).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined(" ")).toBe(true);
    expect(isDefined(0)).toBe(true);
    expect(isDefined(1)).toBe(true);
    expect(isDefined(-1)).toBe(true);
    expect(isDefined(NaN)).toBe(true);
    expect(isDefined(Infinity)).toBe(true);
    expect(isDefined(true)).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined({})).toBe(true);
    expect(isDefined({ key: "value" })).toBe(true);
    expect(isDefined([])).toBe(true);
    expect(isDefined(() => {})).toBe(true);
    expect(isDefined(function () {})).toBe(true);
    expect(isDefined(Symbol("test"))).toBe(true);
    expect(isDefined(new Date())).toBe(true);
  });
});
