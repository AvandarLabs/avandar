import { describe, expect, it } from "vitest";
import { makeCastProbeSqlFromValues } from "./makeCastProbeSqlFromValues";

describe("makeCastProbeSqlFromValues", () => {
  it("builds no query when there is nothing to probe", () => {
    expect(
      makeCastProbeSqlFromValues({ values: [], targetDataType: "DATE" }),
    ).toBeUndefined();
  });

  it("builds no query when every sampled value is already null", () => {
    expect(
      makeCastProbeSqlFromValues({
        values: [null, undefined],
        targetDataType: "DATE",
      }),
    ).toBeUndefined();
  });

  it("casts to the requested type", () => {
    const sql = makeCastProbeSqlFromValues({
      values: ["2020-01-01"],
      targetDataType: "TIMESTAMP",
    });

    expect(sql).toContain("TRY_CAST");
    expect(sql).toContain("AS TIMESTAMP");
  });

  it("renders each sampled value as a text literal", () => {
    const sql = makeCastProbeSqlFromValues({
      values: ["a", 7, true],
      targetDataType: "BIGINT",
    });

    expect(sql).toContain("('a')");
    expect(sql).toContain("('7')");
    expect(sql).toContain("('true')");
  });

  it("escapes a quote in a value rather than ending the literal", () => {
    const sql = makeCastProbeSqlFromValues({
      values: ["O'Brien"],
      targetDataType: "BIGINT",
    });

    expect(sql).toContain("('O''Brien')");
  });

  it("drops null values instead of counting them as cast failures", () => {
    const sql = makeCastProbeSqlFromValues({
      values: ["1", null, "2"],
      targetDataType: "BIGINT",
    });

    // Only the two real values reach the VALUES list, so a column that was
    // already null does not read as a value the cast destroyed.
    expect(sql).toContain("(VALUES ('1'), ('2'))");
  });

  it("renders a date value in a form DuckDB can read back", () => {
    const sql = makeCastProbeSqlFromValues({
      values: [new Date("2020-03-04T05:06:07.000Z")],
      targetDataType: "DATE",
    });

    expect(sql).toContain("('2020-03-04T05:06:07.000Z')");
  });
});
