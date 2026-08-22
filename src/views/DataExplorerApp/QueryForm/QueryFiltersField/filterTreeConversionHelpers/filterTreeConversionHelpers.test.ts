import { describe, expect, it } from "vitest";
import {
  makeLibraryFilterGroupFromQueryFilterGroup,
  makeQueryFilterGroupFromLibraryGroup,
  normalizeLibraryTree,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversionHelpers/filterTreeConversionHelpers";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";

const COLUMN_TYPES: Record<string, AvaDataType.T> = {
  Admin2: "varchar",
  cases: "bigint",
};

const INTERNAL: StructuredQuery.FilterGroup = {
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

describe("makeLibraryFilterGroupFromQueryFilterGroup", () => {
  it("maps our nodes onto the library's shape without renaming operators", () => {
    const library = makeLibraryFilterGroupFromQueryFilterGroup(INTERNAL);
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
    const input = {
      type: "group" as const,
      combinator: "AND" as const,
      rules: [
        {
          type: "rule" as const,
          columnName: "Admin2",
          operator: "=" as const,
          value: "a",
        },
      ],
    };
    const library = makeLibraryFilterGroupFromQueryFilterGroup(input);
    const internal = makeQueryFilterGroupFromLibraryGroup({
      group: library,
      columnTypes: COLUMN_TYPES,
      matchCaseById: {},
    });
    expect(library.id).toBe(internal.id);
    expect(library.rules[0]?.id).toBe(internal.rules[0]?.id);
    const libraryAgain = makeLibraryFilterGroupFromQueryFilterGroup(internal);
    expect(libraryAgain.id).toBe(library.id);
    expect(libraryAgain.rules[0]?.id).toBe(library.rules[0]?.id);
  });
});

describe("makeQueryFilterGroupFromLibraryGroup", () => {
  it("round-trips a tree, preserving ids", () => {
    const library = makeLibraryFilterGroupFromQueryFilterGroup(INTERNAL);
    const internal = makeQueryFilterGroupFromLibraryGroup({
      group: library,
      columnTypes: COLUMN_TYPES,
      matchCaseById: {},
    });
    expect(internal).toEqual(INTERNAL);
  });

  it("derives columnDataType from the live column types", () => {
    const internal = makeQueryFilterGroupFromLibraryGroup({
      group: {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "cases", operator: ">", value: 5 }],
      },
      columnTypes: COLUMN_TYPES,
      matchCaseById: {},
    });
    const rule = internal.rules[0];
    expect(rule?.type === "rule" && rule.columnDataType).toBe("bigint");
  });

  it("leaves columnDataType absent for a column that no longer exists", () => {
    const internal = makeQueryFilterGroupFromLibraryGroup({
      group: {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "gone", operator: "=", value: "x" }],
      },
      columnTypes: COLUMN_TYPES,
      matchCaseById: {},
    });
    const rule = internal.rules[0];
    expect(rule?.type === "rule" && rule.columnDataType).toBeUndefined();
  });

  it("applies match-case state by rule id", () => {
    const internal = makeQueryFilterGroupFromLibraryGroup({
      group: {
        id: "g1",
        combinator: "AND",
        rules: [
          { id: "r1", field: "Admin2", operator: "contains", value: "s" },
        ],
      },
      columnTypes: COLUMN_TYPES,
      matchCaseById: { r1: true },
    });
    const rule = internal.rules[0];
    expect(rule?.type === "rule" && rule.matchCase).toBe(true);
  });

  it("normalizes an unexpected combinator to AND", () => {
    const internal = makeQueryFilterGroupFromLibraryGroup({
      group: { id: "g1", combinator: "xor", rules: [] },
      columnTypes: COLUMN_TYPES,
      matchCaseById: {},
    });
    expect(internal.combinator).toBe("AND");
  });
});

describe("normalizeLibraryTree", () => {
  it("keeps the operator when the new column has the same type facet", () => {
    const nextLibraryGroup = normalizeLibraryTree({
      group: {
        id: "g1",
        combinator: "AND",
        rules: [
          { id: "r1", field: "Admin2", operator: "contains", value: "s" },
        ],
      },
      columnTypes: { Admin2: "varchar", other: "varchar" },
    });
    expect(nextLibraryGroup.rules[0]).toEqual({
      id: "r1",
      field: "Admin2",
      operator: "contains",
      value: "s",
    });
  });

  it("resets an operator the new column type cannot use, and clears the value", () => {
    const nextLibraryGroup = normalizeLibraryTree({
      group: {
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "cases", operator: "contains", value: "s" }],
      },
      columnTypes: { cases: "bigint" },
    });
    expect(nextLibraryGroup.rules[0]).toEqual({
      id: "r1",
      field: "cases",
      operator: "=",
      value: "",
    });
  });

  it("normalizes nested groups too", () => {
    const nextLibraryGroup = normalizeLibraryTree({
      group: {
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
      columnTypes: { cases: "bigint" },
    });
    const nested = nextLibraryGroup.rules[0];
    expect(nested && "rules" in nested && nested.rules[0]).toEqual({
      id: "r1",
      field: "cases",
      operator: "=",
      value: "",
    });
  });

  it("leaves rules on unknown columns alone", () => {
    const rule = {
      id: "r1",
      field: "gone",
      operator: "contains" as const,
      value: "s",
    };
    const nextLibraryGroup = normalizeLibraryTree({
      group: { id: "g1", combinator: "AND", rules: [rule] },
      columnTypes: { Admin2: "varchar" },
    });
    expect(nextLibraryGroup.rules[0]).toEqual(rule);
  });
});
