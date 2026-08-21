import { countFilterRules } from "$/models/queries/StructuredQuery/countFilterRules/countFilterRules.ts";
import { describe, expect, it } from "vitest";

describe("countFilterRules", () => {
  it("counts complete rules as applied", () => {
    expect(
      countFilterRules({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "Admin2",
            columnDataType: "varchar",
            operator: "=",
            value: "a",
          },
        ],
      }),
    ).toEqual({ applied: 1, unfinished: 0, invalid: 0 });
  });

  it("counts incomplete rules as unfinished", () => {
    expect(
      countFilterRules({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "Admin2",
            columnDataType: "varchar",
            operator: "=",
            value: "",
          },
        ],
      }),
    ).toEqual({ applied: 0, unfinished: 1, invalid: 0 });
  });

  it("counts rules that fail validation as invalid", () => {
    expect(
      countFilterRules({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnName: "cases",
            columnDataType: "bigint",
            operator: ">",
            value: "abc",
          },
        ],
      }),
    ).toEqual({ applied: 0, unfinished: 0, invalid: 1 });
  });

  it("counts nested groups", () => {
    expect(
      countFilterRules({
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "group",
            combinator: "OR",
            rules: [
              {
                type: "rule",
                columnName: "Admin2",
                columnDataType: "varchar",
                operator: "=",
                value: "a",
              },
              {
                type: "rule",
                columnName: "Admin2",
                columnDataType: "varchar",
                operator: "=",
                value: "",
              },
            ],
          },
        ],
      }),
    ).toEqual({ applied: 1, unfinished: 1, invalid: 0 });
  });
});
