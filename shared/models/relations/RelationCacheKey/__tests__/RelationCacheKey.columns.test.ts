import { describe, expect, it } from "vitest";
import {
  coversColumns,
  normalizeColumns,
  unionColumnSets,
} from "$/models/relations/RelationCacheKey/RelationCacheKey.ts";

describe("coversColumns", () => {
  it("hits when the cached set equals the needed set", () => {
    expect(coversColumns(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("hits when the needed set is a subset of the cached set", () => {
    expect(coversColumns(["a", "b", "c"], ["a"])).toBe(true);
  });

  it("misses when the needed set is a superset of the cached set", () => {
    expect(coversColumns(["a"], ["a", "b"])).toBe(false);
  });

  it("treats cached 'all' as covering any request", () => {
    expect(coversColumns("all", ["a", "b"])).toBe(true);
    expect(coversColumns("all", "all")).toBe(true);
  });

  it("treats needed 'all' against a finite cached set as a miss", () => {
    expect(coversColumns(["a", "b"], "all")).toBe(false);
  });

  it("compares column names case-sensitively", () => {
    expect(coversColumns(["A"], ["a"])).toBe(false);
  });
});

describe("normalizeColumns", () => {
  it("sorts and deduplicates a finite set, preserving case", () => {
    expect(normalizeColumns(["b", "a", "b", "A"])).toEqual(["A", "a", "b"]);
  });

  it("leaves 'all' alone", () => {
    expect(normalizeColumns("all")).toBe("all");
  });
});

describe("unionColumnSets", () => {
  it("returns 'all' when either side is 'all'", () => {
    expect(unionColumnSets("all", ["a"])).toBe("all");
    expect(unionColumnSets(["a"], "all")).toBe("all");
    expect(unionColumnSets("all", "all")).toBe("all");
  });

  it("sorts and deduplicates two finite sets, preserving case", () => {
    expect(unionColumnSets(["b"], ["a", "b"])).toEqual(["a", "b"]);
    expect(unionColumnSets(["A"], ["a"])).toEqual(["A", "a"]);
  });
});
