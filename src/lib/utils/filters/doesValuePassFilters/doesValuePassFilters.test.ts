import { describe, expect, it } from "vitest";

import { doesValuePassFilters } from "./doesValuePassFilters";

describe("doesValuePassFilters", () => {
  it("handles equality comparisons", () => {
    expect(doesValuePassFilters("foo", "eq", "foo")).toBe(true);
    expect(doesValuePassFilters("foo", "eq", "bar")).toBe(false);
  });

  it("handles \"in\" comparisons", () => {
    expect(doesValuePassFilters("foo", "in", ["bar", "foo"]))
      .toBe(true);
    expect(doesValuePassFilters("foo", "in", ["bar"]))
      .toBe(false);
  });

  it("returns false when \"in\" receives a non-array", () => {
    expect(doesValuePassFilters("foo", "in", "foo")).toBe(false);
  });
});
