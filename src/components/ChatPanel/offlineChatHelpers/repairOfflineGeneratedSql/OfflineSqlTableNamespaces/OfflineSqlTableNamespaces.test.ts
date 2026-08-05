import pkg from "node-sql-parser";
import { describe, expect, it } from "vitest";
import { OfflineSqlTableNamespaces } from "@/components/ChatPanel/offlineChatHelpers/repairOfflineGeneratedSql/OfflineSqlTableNamespaces/OfflineSqlTableNamespaces";

const { Parser } = pkg;

describe("OfflineSqlTableNamespaces.stripInSql", () => {
  it("strips schema-qualified double-quoted FROM tables", () => {
    const sql = 'SELECT * FROM "duckdb_views"."covid_us_deaths" LIMIT 100';
    expect(OfflineSqlTableNamespaces.stripInSql(sql)).toBe(
      'SELECT * FROM "covid_us_deaths" LIMIT 100',
    );
  });

  it("strips unquoted schema.table in JOIN", () => {
    const sql = 'SELECT * FROM "a" JOIN duckdb_views.covid_us_deaths ON true';
    expect(OfflineSqlTableNamespaces.stripInSql(sql)).toBe(
      'SELECT * FROM "a" JOIN covid_us_deaths ON true',
    );
  });

  it("strips chained qualifiers to the final segment", () => {
    const sql = 'SELECT 1 FROM "catalog"."schema"."table_name"';
    expect(OfflineSqlTableNamespaces.stripInSql(sql)).toBe(
      'SELECT 1 FROM "table_name"',
    );
  });
});

describe("OfflineSqlTableNamespaces.stripInSelectAst", () => {
  it("clears db on parsed FROM entries before remapping", () => {
    const parser = new Parser();
    const ast = parser.astify(
      'SELECT * FROM "duckdb_views"."covid_us_deaths"',
      { database: "postgresql" },
    ) as unknown as Record<string, unknown>;
    const changed = OfflineSqlTableNamespaces.stripInSelectAst(ast);
    expect(changed).toBe(true);
    const from = (ast.from as Array<Record<string, unknown>>)[0]!;
    expect(from.db).toBeUndefined();
    expect(from.table).toBe("covid_us_deaths");
  });
});
