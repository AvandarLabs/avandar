import { describe, expect, it } from "vitest";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";

/**
 * Covers every column type, so a type added to `AvaDataType.Types` without a
 * rule decision fails here.
 */
describe("ValuePickerRule.getOutputDataType", () => {
  it.each(AvaDataType.Types)(
    "keeps a %s column's type under first, most frequent, max, and min",
    (columnDataType) => {
      const outputDataTypes = (
        ["first", "most_frequent", "max", "min"] as const
      ).map((ruleType) => {
        return ValuePickerRule.getOutputDataType({ ruleType, columnDataType });
      });

      expect(outputDataTypes).toEqual([
        columnDataType,
        columnDataType,
        columnDataType,
        columnDataType,
      ]);
    },
  );

  it.each(["bigint", "double"] as const)(
    "emits a decimal for the sum and average of a %s column",
    (columnDataType) => {
      expect(
        ValuePickerRule.getOutputDataType({ ruleType: "sum", columnDataType }),
      ).toBe("double");
      expect(
        ValuePickerRule.getOutputDataType({ ruleType: "avg", columnDataType }),
      ).toBe("double");
    },
  );

  it.each(AvaDataType.Types)(
    "emits a whole number for the count of a %s column",
    (columnDataType) => {
      expect(
        ValuePickerRule.getOutputDataType({
          ruleType: "count",
          columnDataType,
        }),
      ).toBe("bigint");
    },
  );
});

describe("ValuePickerRule.getAllowedRuleTypes", () => {
  const EVERY_RULE = [
    "most_frequent",
    "first",
    "sum",
    "avg",
    "count",
    "max",
    "min",
  ] as const;
  const ORDERABLE_RULES = [
    "most_frequent",
    "first",
    "count",
    "max",
    "min",
  ] as const;

  it.each([
    ["bigint", EVERY_RULE],
    ["double", EVERY_RULE],
    ["varchar", ORDERABLE_RULES],
    ["date", ORDERABLE_RULES],
    ["time", ORDERABLE_RULES],
    ["timestamp", ORDERABLE_RULES],
    ["boolean", ["most_frequent", "first", "count"]],
  ] as const)(
    "offers a %s column exactly its allowed rules, in menu order",
    (columnDataType, expectedRuleTypes) => {
      expect(ValuePickerRule.getAllowedRuleTypes({ columnDataType })).toEqual(
        expectedRuleTypes,
      );
    },
  );
});

describe("ValuePickerRule.isAllowedForColumnType", () => {
  it("refuses a sum over a text column", () => {
    expect(
      ValuePickerRule.isAllowedForColumnType({
        ruleType: "sum",
        columnDataType: "varchar",
      }),
    ).toBe(false);
  });

  it("refuses a max over a yes/no column", () => {
    expect(
      ValuePickerRule.isAllowedForColumnType({
        ruleType: "max",
        columnDataType: "boolean",
      }),
    ).toBe(false);
  });
});

describe("ValuePickerRule.toAllowedRuleType", () => {
  it("replaces a sum over a text column with most_frequent", () => {
    expect(
      ValuePickerRule.toAllowedRuleType({
        ruleType: "sum",
        columnDataType: "varchar",
      }),
    ).toBe("most_frequent");
  });

  it("keeps a max over a date column", () => {
    expect(
      ValuePickerRule.toAllowedRuleType({
        ruleType: "max",
        columnDataType: "date",
      }),
    ).toBe("max");
  });
});
