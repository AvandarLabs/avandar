import { propEq } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { reconcileQueryResultColumnBindings } from "$/models/queries/QueryResultColumnBindings/reconcileQueryResultColumnBindings/reconcileQueryResultColumnBindings";
import { withDuckDb } from "./executedDuckDb";
import type {
  QueryResultColumnBindings,
  QueryResultColumnBindingRegistry,
} from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
/** DuckDB labels retain saved aggregate targets through SQL spelling edits. */
import type { DuckDBConnection, DuckDBValue } from "@duckdb/node-api";

async function _executeAndBindQueryResultColumns({
  connection,
  sql,
  previous,
}: {
  connection: DuckDBConnection;
  sql: string;
  previous?: QueryResultColumnBindingRegistry;
}): Promise<{
  rows: Array<Record<string, DuckDBValue>>;
  schema: QueryResultColumnBindings;
}> {
  const result = await connection.runAndReadAll(sql);
  const columns = result.columnNames().map((name) => {
    return { name, dataType: "double" as const };
  });
  return {
    rows: result.getRowObjects(),
    schema: reconcileQueryResultColumnBindings({
      scopeKey: "saved-chart",
      sqlKey: sql,
      columns,
      projections: makeProjectionDescriptorsFromSql({ sql, columns }),
      previous,
    }),
  };
}

describe("query column bindings with real DuckDB metadata", () => {
  it.each([
    {
      column: "revenue",
      expression: "s.revenue",
      source: "sales s",
      queryResultColumnName: "sum(s.revenue)",
    },
    {
      column: '"revenue"',
      expression: '"revenue"',
      source: "sales",
      queryResultColumnName: "sum(revenue)",
    },
    {
      column: '"Revenue Value"',
      expression: '"Revenue Value"',
      source: "sales",
      queryResultColumnName: 'sum("Revenue Value")',
    },
    {
      column: '"Revenue Value"',
      expression: '"S"."Revenue Value"',
      source: 'sales "S"',
      queryResultColumnName: 'sum(S."Revenue Value")',
    },
    {
      column: '"select"',
      expression: 's."select"',
      source: "sales s",
      queryResultColumnName: 'sum(s."select")',
    },
  ])(
    "keeps a saved target reading revenue through $expression and alias edits",
    async ({ column, expression, source, queryResultColumnName }) => {
      await withDuckDb(async (connection) => {
        await connection.run(
          `CREATE TABLE sales AS SELECT 7::DOUBLE AS ${column}, 3::DOUBLE AS profit`,
        );
        const original = await _executeAndBindQueryResultColumns({
          connection: connection,
          sql: `SELECT SUM(${column}) AS total, SUM(profit) AS profit FROM sales`,
        });
        const savedId = original.schema.columns.find(
          propEq("name", "total"),
        )!.id;
        const qualified = await _executeAndBindQueryResultColumns({
          connection: connection,
          sql: `SELECT SUM(profit) AS profit, SUM(${expression}) FROM ${source}`,
          previous: original.schema.registry,
        });
        const selected = qualified.schema.columns.find(propEq("id", savedId));
        expect(qualified.schema.issues).toEqual([]);
        expect(selected?.name).toBe(queryResultColumnName);
        expect(qualified.rows[0]?.[selected!.name]).toBe(7);
        const renamed = await _executeAndBindQueryResultColumns({
          connection: connection,
          sql: `SELECT SUM(${expression}) AS amount, SUM(profit) AS profit FROM ${source}`,
          previous: qualified.schema.registry,
        });
        const renamedTarget = renamed.schema.columns.find(
          propEq("id", savedId),
        );
        expect(renamedTarget?.name).toBe("amount");
        expect(renamed.rows[0]?.[renamedTarget!.name]).toBe(7);
      });
    },
  );
});
