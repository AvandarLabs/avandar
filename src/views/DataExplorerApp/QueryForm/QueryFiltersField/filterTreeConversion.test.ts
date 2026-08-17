import { describe, expect, it } from "vitest";
import {
  normalizeLibraryTree,
  toInternalFilterGroup,
  toLibraryFilterGroup,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversion";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";

const COLUMN_TYPES: Readonly<Record<string, AvaDataType.T>> = {
  Admin2: "varchar",
  cases: "bigint",
};

const INTERNAL: QueryFilterGroup = {
  type: "group",
  id: "g1",
  combinator: "AND",
  rules: [
    {
      type: "rule",
      id: "r1",
      columnName: "Admin2",
      columnDataType: "varchar",
      operator: "contains",
      value: "san",
    },
    {
      type: "group",
      id: "g2",
      combinator: "OR",
      rules: [
        {
          type: "rule",
          id: "r2",
          columnName: "cases",
          columnDataType: "bigint",
          operator: "between",
          value: [1, 2],
        },
      ],
    },
  ],
};

describe("toLibraryFilterGroup", () => {
  it("maps our nodes onto the library's shape without renaming operators", () => {
    const library = toLibraryFilterGroup(INTERNAL);
    expect(library).toEqual({
      id: "g1",
      combinator: "AND",
      rules: [
        { id: "r1", field: "Admin2", operator: "contains", value: "san" },
        {
          id: "g2",
          combinator: "OR",
          rules: [
            { id: "r2", field: "cases", operator: "between", value: [1, 2] },
          ],
        },
      ],
    });
  });

  it("generates ids for nodes that have none, so identity is stable afterwards", () => {
    const library = toLibraryFilterGroup({
      type: "group",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          columnName: "Admin2",
          operator: "=",
          value: "a",
        },
      ],
    });
    expect(library.id).toMatch(/.+/);
    expect(library.rules[0]?.id).toMatch(/.+/);
  });
});

describe("toInternalFilterGroup", () => {
  it("round-trips a tree, preserving ids", () => {
    const library = toLibraryFilterGroup(INTERNAL);
    const internal = toInternalFilterGroup(library, {
      columnTypes: COLUMN_TYPES,
      matchCaseById: {},
    });
    expect(internal).toEqual(INTERNAL);
  });

  it("derives columnDataType from the live column types", () => {
    const internal = toInternalFilterGroup(
      {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "cases", operator: ">", value: 5 }],
      },
      { columnTypes: COLUMN_TYPES, matchCaseById: {} },
    );
    const rule = internal.rules[0];
    expect(rule?.type === "rule" && rule.columnDataType).toBe("bigint");
  });

  it("leaves columnDataType absent for a column that no longer exists", () => {
    const internal = toInternalFilterGroup(
      {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "gone", operator: "=", value: "x" }],
      },
      { columnTypes: COLUMN_TYPES, matchCaseById: {} },
    );
    const rule = internal.rules[0];
    expect(rule?.type === "rule" && rule.columnDataType).toBeUndefined();
  });

  it("applies match-case state by rule id", () => {
    const internal = toInternalFilterGroup(
      {
        id: "g1",
        combinator: "AND",
        rules: [
          { id: "r1", field: "Admin2", operator: "contains", value: "s" },
        ],
      },
      { columnTypes: COLUMN_TYPES, matchCaseById: { r1: true } },
    );
    const rule = internal.rules[0];
    expect(rule?.type === "rule" && rule.matchCase).toBe(true);
  });

  it("normalizes an unexpected combinator to AND", () => {
    const internal = toInternalFilterGroup(
      { id: "g1", combinator: "xor", rules: [] },
      { columnTypes: COLUMN_TYPES, matchCaseById: {} },
    );
    expect(internal.combinator).toBe("AND");
  });
});

describe("normalizeLibraryTree", () => {
  it("keeps the operator when the new column has the same type facet", () => {
    const next = normalizeLibraryTree(
      {
        id: "g1",
        combinator: "AND",
        rules: [
          { id: "r1", field: "Admin2", operator: "contains", value: "s" },
        ],
      },
      { Admin2: "varchar", other: "varchar" },
    );
    expect(next.rules[0]).toEqual({
      id: "r1",
      field: "Admin2",
      operator: "contains",
      value: "s",
    });
  });

  it("resets an operator the new column type cannot use, and clears the value", () => {
    const next = normalizeLibraryTree(
      {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "cases", operator: "contains", value: "s" }],
      },
      { cases: "bigint" },
    );
    expect(next.rules[0]).toEqual({
      id: "r1",
      field: "cases",
      operator: "=",
      value: "",
    });
  });

  it("normalizes nested groups too", () => {
    const next = normalizeLibraryTree(
      {
        id: "g1",
        combinator: "AND",
        rules: [
          {
            id: "g2",
            combinator: "OR",
            rules: [
              { id: "r1", field: "cases", operator: "is_blank", value: null },
            ],
          },
        ],
      },
      { cases: "bigint" },
    );
    const nested = next.rules[0];
    expect(nested && "rules" in nested && nested.rules[0]).toEqual({
      id: "r1",
      field: "cases",
      operator: "=",
      value: "",
    });
  });

  it("leaves rules on unknown columns alone", () => {
    const rule = { id: "r1", field: "gone", operator: "contains", value: "s" };
    const next = normalizeLibraryTree(
      { id: "g1", combinator: "AND", rules: [rule] },
      { Admin2: "varchar" },
    );
    expect(next.rules[0]).toEqual(rule);
  });
});
