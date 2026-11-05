import { describe, expect, it } from "vitest";
import { renderFilterGroup as renderGroup } from "$/models/queries/StructuredQuery/renderFilterGroup/renderFilterGroup.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type { SqlFragment } from "$/models/queries/StructuredQuery/renderFilterRule/renderFilterRule.ts";

const TEXT_RULE = {
  type: "rule",
  columnId: "Admin2" as QueryColumn.Id,
  columnDataType: "varchar",
  operator: "=",
  value: "Alameda",
  matchCase: true,
} as const;

const NUMERIC_RULE = {
  type: "rule",
  columnId: "cases" as QueryColumn.Id,
  columnDataType: "bigint",
  operator: ">",
  value: 100,
} as const;

function _group(overrides: Partial<QueryFilterGroup>): QueryFilterGroup {
  return { type: "group", combinator: "AND", rules: [], ...overrides };
}

describe("renderFilterGroup", () => {
  it("returns undefined for an empty group", () => {
    expect(_renderFilterGroup(_group({}))).toBeUndefined();
  });

  it("renders a single rule without parentheses", () => {
    expect(_renderFilterGroup(_group({ rules: [TEXT_RULE] }))).toEqual({
      sql: '"Admin2" = ?',
      bindings: ["Alameda"],
    });
  });

  it("joins rules with the group combinator", () => {
    expect(
      _renderFilterGroup(_group({ rules: [TEXT_RULE, NUMERIC_RULE] })),
    ).toEqual({
      sql: '"Admin2" = ? and "cases" > ?',
      bindings: ["Alameda", 100],
    });
  });

  it("joins with OR when the combinator is OR", () => {
    expect(
      _renderFilterGroup(
        _group({ combinator: "OR", rules: [TEXT_RULE, NUMERIC_RULE] }),
      )?.sql,
    ).toBe('"Admin2" = ? or "cases" > ?');
  });

  it("parenthesises nested groups and keeps binding order", () => {
    const fragment = _renderFilterGroup(
      _group({
        combinator: "AND",
        rules: [
          NUMERIC_RULE,
          _group({
            combinator: "OR",
            rules: [TEXT_RULE, { ...TEXT_RULE, value: "Butte" }],
          }),
        ],
      }),
    );
    expect(fragment?.sql).toBe(
      '"cases" > ? and ("Admin2" = ? or "Admin2" = ?)',
    );
    expect(fragment?.bindings).toEqual([100, "Alameda", "Butte"]);
  });

  it("skips incomplete rules instead of rendering them", () => {
    expect(
      _renderFilterGroup(
        _group({ rules: [TEXT_RULE, { ...TEXT_RULE, value: "" }] }),
      ),
    ).toEqual({ sql: '"Admin2" = ?', bindings: ["Alameda"] });
  });

  it("returns undefined when every rule is incomplete", () => {
    expect(
      _renderFilterGroup(_group({ rules: [{ ...TEXT_RULE, value: "" }] })),
    ).toBeUndefined();
  });

  it("drops empty nested groups", () => {
    expect(
      _renderFilterGroup(_group({ rules: [TEXT_RULE, _group({})] }))?.sql,
    ).toBe('"Admin2" = ?');
  });
});

function _renderFilterGroup(group: QueryFilterGroup): SqlFragment | undefined {
  return renderGroup(group, {
    getColumn: (columnId) => {
      return {
        sql: `"${columnId}"`,
        dataType: columnId === "cases" ? "bigint" : "varchar",
      };
    },
  });
}
