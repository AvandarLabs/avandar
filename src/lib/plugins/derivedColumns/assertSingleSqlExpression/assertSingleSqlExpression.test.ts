import { PluginError } from "@avandar/plugin-sdk";
import { describe, expect, it } from "vitest";
import { assertSingleSqlExpression } from "@/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression";

/**
 * The `PluginError` code `assertSingleSqlExpression` throws for `expression`,
 * undefined when it accepts it, or `"not a PluginError"` for any other throw.
 */
function _getThrownCode(expression: string): string | undefined {
  try {
    assertSingleSqlExpression(expression);
    return undefined;
  } catch (error) {
    return error instanceof PluginError ? error.code : "not a PluginError";
  }
}

describe("assertSingleSqlExpression", () => {
  it("accepts arithmetic that divides through NULLIF", () => {
    expect(
      _getThrownCode(`"case_count" * 100000.0 / NULLIF("pop_2024", 0)`),
    ).toBeUndefined();
  });

  it("accepts a CASE expression that calls power and sqrt", () => {
    expect(
      _getThrownCode(
        `CASE WHEN "cases" = 0 THEN 0 ELSE "cases" * power(1 - 1 / (9.0 * "cases") - 1.96 / (3.0 * sqrt("cases")), 3) END`,
      ),
    ).toBeUndefined();
  });

  it("accepts a window over a date range with PARTITION BY", () => {
    expect(
      _getThrownCode(
        `avg("cases") OVER (PARTITION BY "borough" ORDER BY "date" RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW)`,
      ),
    ).toBeUndefined();
  });

  it("accepts a window over a date range without PARTITION BY", () => {
    expect(
      _getThrownCode(
        `avg("cases") OVER (ORDER BY "date" RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW)`,
      ),
    ).toBeUndefined();
  });

  it.each([
    ["a statement separator", `"a"; DROP TABLE t`],
    ["a line comment", `"a" -- comment`],
    ["a block comment", `"a" /* comment */`],
    ["a subquery", `(SELECT 1)`],
    ["a subquery inside arithmetic", `"a" + (SELECT max("x") FROM t)`],
    ["a FROM clause", `"a" FROM t`],
    ["a WHERE clause", `"a" WHERE 1 = 1`],
    ["a GROUP BY clause", `"a" GROUP BY 1`],
    ["a HAVING clause", `count(*) HAVING count(*) > 1`],
    ["an ORDER BY clause", `"a" ORDER BY 1`],
    ["a LIMIT clause", `"a" LIMIT 1`],
    ["a UNION", `"a" UNION SELECT 1`],
    ["two expressions", `"a", "b"`],
    ["an alias", `"a" AS b`],
    ["a star", `*`],
    ["an empty string", ``],
    ["text that is not SQL", `)(*& not sql`],
  ])("rejects %s with InvalidExpression", (_label, expression) => {
    expect(_getThrownCode(expression)).toBe("InvalidExpression");
  });
});
