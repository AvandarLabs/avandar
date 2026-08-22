import { describe, expect, it } from "vitest";

import { compare, formatDiff } from "./compare";

describe("compare", () => {
  it("returns no diffs when the two maps are identical", () => {
    const map = new Map([
      ["a.gen.sql", "create table a;"],
      ["b.gen.sql", "create table b;"],
    ]);
    expect(compare({ committed: map, fresh: map })).toEqual([]);
  });

  it("flags files in fresh that are missing from committed as added", () => {
    const committed = new Map<string, string>();
    const fresh = new Map([["new.gen.sql", "create table new;"]]);
    expect(compare({ committed, fresh })).toEqual([
      { kind: "added", name: "new.gen.sql" },
    ]);
  });

  it("flags files in committed that are missing from fresh as removed", () => {
    const committed = new Map([["old.gen.sql", "create table old;"]]);
    const fresh = new Map<string, string>();
    expect(compare({ committed, fresh })).toEqual([
      { kind: "removed", name: "old.gen.sql" },
    ]);
  });

  it("flags files with differing contents as changed", () => {
    const committed = new Map([["x.gen.sql", "create table x (id text);"]]);
    const fresh = new Map([["x.gen.sql", "create table x (id integer);"]]);
    expect(compare({ committed, fresh })).toEqual([
      { kind: "changed", name: "x.gen.sql" },
    ]);
  });

  it("returns entries sorted by filename across all diff kinds", () => {
    const committed = new Map([
      ["z.gen.sql", "drop"],
      ["a.gen.sql", "same"],
    ]);
    const fresh = new Map([
      ["a.gen.sql", "same"],
      ["m.gen.sql", "add"],
    ]);
    expect(compare({ committed, fresh })).toEqual([
      { kind: "added", name: "m.gen.sql" },
      { kind: "removed", name: "z.gen.sql" },
    ]);
  });

  it("returns an empty result for two empty maps", () => {
    expect(compare({ committed: new Map(), fresh: new Map() })).toEqual([]);
  });
});

describe("formatDiff", () => {
  it("renders added entries with a +", () => {
    expect(formatDiff({ kind: "added", name: "x.gen.sql" })).toMatch(
      /^\+ x\.gen\.sql/,
    );
  });

  it("renders removed entries with a -", () => {
    expect(formatDiff({ kind: "removed", name: "x.gen.sql" })).toMatch(
      /^- x\.gen\.sql/,
    );
  });

  it("renders changed entries with a ~", () => {
    expect(formatDiff({ kind: "changed", name: "x.gen.sql" })).toMatch(
      /^~ x\.gen\.sql/,
    );
  });
});
