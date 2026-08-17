import { renderFilterGroup } from "$/models/queries/StructuredQuery/renderFilterGroup.ts";
import { describe, expect, it } from "vitest";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

const TEXT_RULE = {
  type: "rule",
  columnName: "Admin2",
  columnDataType: "varchar",
  operator: "=",
  value: "Alameda",
  matchCase: true,
} as const;

const NUM_RULE = {
  type: "rule",
  columnName: "cases",
  columnDataType: "bigint",
  operator: ">",
  value: 100,
} as const;

function _group(overrides: Partial<QueryFilterGroup>): QueryFilterGroup {
  return { type: "group", combinator: "AND", rules: [], ...overrides };
}

describe("renderFilterGroup", () => {
  it("returns undefined for an empty group", () => {
    expect(renderFilterGroup(_group({}))).toBeUndefined();
  });

  it("renders a single rule without parentheses", () => {
    expect(renderFilterGroup(_group({ rules: [TEXT_RULE] }))).toEqual({
      sql: '"Admin2" = ?',
      bindings: ["Alameda"],
    });
  });

  it("joins rules with the group combinator", () => {
    expect(
      renderFilterGroup(_group({ rules: [TEXT_RULE, NUM_RULE] })),
    ).toEqual({
      sql: '"Admin2" = ? and "cases" > ?',
      bindings: ["Alameda", 100],
    });
  });

  it("joins with OR when the combinator is OR", () => {
    expect(
      renderFilterGroup(
        _group({ combinator: "OR", rules: [TEXT_RULE, NUM_RULE] }),
      )?.sql,
    ).toBe('"Admin2" = ? or "cases" > ?');
  });

  it("parenthesises nested groups and keeps binding order", () => {
    const fragment = renderFilterGroup(
      _group({
        combinator: "AND",
        rules: [
          NUM_RULE,
          _group({
            combinator: "OR",
            rules: [TEXT_RULE, { ...TEXT_RULE, value: "Butte" }],
          }),
        ],
      }),
    );
    expect(fragment?.sql).toBe('"cases" > ? and ("Admin2" = ? or "Admin2" = ?)');
    expect(fragment?.bindings).toEqual([100, "Alameda", "Butte"]);
  });

  it("skips incomplete rules instead of rendering them", () => {
    expect(
      renderFilterGroup(
        _group({ rules: [TEXT_RULE, { ...TEXT_RULE, value: "" }] }),
      ),
    ).toEqual({ sql: '"Admin2" = ?', bindings: ["Alameda"] });
  });

  it("returns undefined when every rule is incomplete", () => {
    expect(
      renderFilterGroup(_group({ rules: [{ ...TEXT_RULE, value: "" }] })),
    ).toBeUndefined();
  });

  it("drops empty nested groups", () => {
    expect(
      renderFilterGroup(_group({ rules: [TEXT_RULE, _group({})] }))?.sql,
    ).toBe('"Admin2" = ?');
  });
});
