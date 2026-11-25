import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql.ts";
/** SQL lineage must be supported, alias-free, and tied to one source. */
import type { ProjectionDescriptor } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types.ts";

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
  it("expands a sole star from the known single-source QueryResult columns", () => {
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
  it("reads a row count beside the column it is grouped by", () => {
    const columns = _describe({
      sql: "SELECT region, COUNT(*) FROM sales GROUP BY region",
      names: ["region", "count_star()"],
    });
    expect(columns.map(prop("queryResultColumnName"))).toEqual([
      "region",
      "count_star()",
    ]);
    expect(columns[0]?.expressionKey).toBe(
      _describe({ sql: "SELECT region FROM sales", names: ["region"] })[0]
        ?.expressionKey,
    );
  });
  it("reads a GROUP BY position as the SELECT item it points at", () => {
    expect(
      _describe({
        sql: "SELECT region, COUNT(*) AS amount FROM sales GROUP BY 1",
        names: ["region", "amount"],
      }).map(prop("queryResultColumnName")),
    ).toEqual(["region", "amount"]);
  });
  it("names an aliased row count by its alias", () => {
    expect(
      _describe({
        sql: "SELECT count(*) AS amount FROM sales",
      }).map(prop("queryResultColumnName")),
    ).toEqual(["amount"]);
  });
  it("keys a row count apart from a count of one column", () => {
    const rowCount = _describe({ sql: "SELECT COUNT(*) AS amount FROM sales" });
    const revenueCount = _describe({
      sql: "SELECT COUNT(revenue) AS amount FROM sales",
    });
    expect(rowCount).toHaveLength(1);
    expect(rowCount[0]?.expressionKey).not.toBe(revenueCount[0]?.expressionKey);
  });
  it.each([
    "SELECT revenue + 1 AS amount FROM sales",
    "SELECT revenue[1] AS amount FROM sales",
    "SELECT revenue AS amount FROM sales GROUP BY lower(revenue)",
    "SELECT SUM(revenue) OVER () AS amount FROM sales",
    "SELECT SUM(DISTINCT revenue) AS amount FROM sales",
    "SELECT SUM(*) AS amount FROM sales",
    "SELECT region, COUNT(*) AS amount FROM sales GROUP BY 2",
    "SELECT region, COUNT(*) AS amount FROM sales GROUP BY 3",
    "SELECT COUNT(*) FILTER (WHERE revenue > 0) AS amount FROM sales",
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
