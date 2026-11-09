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
    ["a QUALIFY clause", `1 QUALIFY 1 = 1`],
    ["a WINDOW clause", `1 WINDOW w AS (ORDER BY 1)`],
    ["an INTO clause", `1 INTO t`],
    ["DISTINCT", `DISTINCT 1`],
    ["TOP", `TOP 1 1`],
    ["two expressions", `"a", "b"`],
    ["an alias", `"a" AS b`],
    ["a star", `*`],
    ["an empty string", ``],
    ["text that is not SQL", `)(*& not sql`],
  ])("rejects %s with InvalidExpression", (_label, expression) => {
    expect(_getThrownCode(expression)).toBe("InvalidExpression");
  });

  it.each([
    [
      "row_number over an ordered window",
      `row_number() OVER (ORDER BY "date")`,
    ],
    ["count of all rows", `count(*)`],
    [
      "a row-count window over a date range",
      `count(*) OVER (PARTITION BY "borough" ORDER BY "date" RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW) / 7.0`,
    ],
    ["a qualified function the deny-list does not name", `main.abs("a")`],
  ])("accepts %s", (_label, expression) => {
    expect(_getThrownCode(expression)).toBeUndefined();
  });

  it.each([
    ["read_csv", `read_csv('/etc/passwd')`],
    ["read_text in upper case", `READ_TEXT('/etc/passwd')`],
    ["read_parquet with a schema prefix", `main.read_parquet('x')`],
    ["a quoted read_csv name", `"read_csv"('x')`],
    ["query", `query('select 1')`],
    ["query_table", `query_table('t')`],
    ["parquet_metadata", `parquet_metadata('x')`],
    ["iceberg_scan", `iceberg_scan('x')`],
    ["delta_scan", `delta_scan('x')`],
    ["http_get", `http_get('https://example.com')`],
    ["pragma_table_info", `pragma_table_info('t')`],
    ["duckdb_settings", `duckdb_settings()`],
    ["sniff_csv", `sniff_csv('x')`],
    ["glob", `glob('*')`],
    ["current_setting", `current_setting('home_directory')`],
    [
      "current_setting with a schema prefix",
      `pg_catalog.current_setting('home_directory')`,
    ],
    ["getenv", `getenv('HOME')`],
    ["nextval", `nextval('s')`],
    ["setval", `setval('s', 1)`],
    ["currval", `currval('s')`],
    ["which_secret", `which_secret('s3://x', 's3')`],
    ["load", `load('httpfs')`],
    ["install", `install('httpfs')`],
    ["sqlite_scan in mixed case", `SQLite_Scan('x.db', 't')`],
    [
      "postgres_query with a schema prefix",
      `main.postgres_query('db', 'select 1')`,
    ],
    ["mysql_query", `mysql_query('db', 'select 1')`],
    ["ducklake_snapshots", `ducklake_snapshots('lake')`],
    [
      "json_execute_serialized_sql in upper case",
      `JSON_EXECUTE_SERIALIZED_SQL('x')`,
    ],
    ["checkpoint", `checkpoint()`],
    ["force_checkpoint with a schema prefix", `main.Force_Checkpoint()`],
    ["getvariable", `getvariable('x')`],
    ["read_csv nested in coalesce", `coalesce(read_csv('x'), 0)`],
    ["read_csv nested in arithmetic", `1 + abs(read_text('x'))`],
    ["read_csv inside an aggregate", `sum(read_csv('x'))`],
    [
      "query inside an OVER window",
      `sum("a") OVER (PARTITION BY query('select 1') ORDER BY "date")`,
    ],
    [
      "getenv inside a window with a date range",
      `avg("cases") OVER (ORDER BY getenv('x') RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW)`,
    ],
  ])(
    "rejects the denied function %s with InvalidExpression",
    (_label, expression) => {
      expect(_getThrownCode(expression)).toBe("InvalidExpression");
    },
  );
});
