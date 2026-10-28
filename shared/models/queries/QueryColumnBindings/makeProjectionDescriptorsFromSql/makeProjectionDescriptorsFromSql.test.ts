import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql.ts";
/** SQL lineage must be supported, alias-free, and tied to one source. */
import type { ProjectionDescriptor } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types.ts";

function _describe({
  sql,
  names = ["amount"],
}: {
  sql: string;
  names?: string[];
}): ProjectionDescriptor[] {
  return makeProjectionDescriptorsFromSql({
    sql,
    columns: names.map((name) => {
      return { name, dataType: "double" };
    }),
  });
}
describe("makeProjectionDescriptorsFromSql", () => {
  it("retains the expression key through alias-only edits and table aliases", () => {
    const original = _describe({
      sql: "SELECT SUM(s.revenue) AS total FROM sales s",
      names: ["total"],
    });
    const renamed = _describe({
      sql: "SELECT sum(revenue) AS amount FROM sales",
    });
    expect(original).toHaveLength(1);
    expect(renamed[0]?.expressionKey).toBe(original[0]?.expressionKey);
    expect(renamed[0]?.queryResultColumnName).toBe("amount");
    expect(renamed[0]?.identity).toBe("sql");
  });
  it("distinguishes physical relation, qualification, column, and aggregation", () => {
    const keys = [
      "SELECT SUM(revenue) AS amount FROM sales",
      "SELECT SUM(revenue) AS amount FROM other",
      "SELECT SUM(revenue) AS amount FROM archive.sales",
      "SELECT SUM(revenue) AS amount FROM archive.public.sales",
      "SELECT AVG(revenue) AS amount FROM sales",
      "SELECT SUM(profit) AS amount FROM sales",
    ].flatMap((sql) => {
      return _describe({ sql: sql }).map(prop("expressionKey"));
    });
    expect(new Set(keys).size).toBe(6);
  });
  it("expands a sole star from the known single-source output schema", () => {
    const columns = _describe({
      sql: "SELECT s.* FROM sales s",
      names: ["revenue", "profit"],
    });
    expect(columns.map(prop("queryResultColumnName"))).toEqual([
      "revenue",
      "profit",
    ]);
    expect(columns[0]?.expressionKey).toBe(
      _describe({ sql: "SELECT revenue FROM sales", names: ["revenue"] })[0]
        ?.expressionKey,
    );
  });
  it("returns projection names in SELECT order when metadata order differs", () => {
    expect(
      _describe({
        sql: "SELECT region, SUM(revenue) AS amount FROM sales GROUP BY region",
        names: ["amount", "region"],
      }).map(prop("queryResultColumnName")),
    ).toEqual(["region", "amount"]);
  });
  it.each([
    "SELECT revenue + 1 AS amount FROM sales",
    "SELECT revenue[1] AS amount FROM sales",
    "SELECT revenue AS amount FROM sales GROUP BY lower(revenue)",
    "SELECT SUM(revenue) OVER () AS amount FROM sales",
    "SELECT SUM(DISTINCT revenue) AS amount FROM sales",
    "SELECT COUNT(*) AS amount FROM sales",
    "SELECT revenue AS amount FROM sales JOIN other ON sales.id = other.id",
    "SELECT revenue AS amount FROM (SELECT * FROM sales) s",
    "WITH s AS (SELECT * FROM sales) SELECT revenue AS amount FROM s",
    "SELECT revenue AS amount FROM sales UNION SELECT revenue FROM other",
    "SELECT DISTINCT revenue AS amount FROM sales",
    "SELECT *, revenue AS amount FROM sales",
    "SELECT other.revenue AS amount FROM sales",
    "SELECT other.sales.revenue AS amount FROM archive.sales",
    "SELECT revenue FROM sales; SELECT profit FROM sales",
    "not sql",
  ])("does not invent lineage for opaque SQL: %s", (sql) => {
    expect(_describe({ sql: sql })).toEqual([]);
  });
});
