import { identity } from "@avandar/utils";
import { quotePostgresRelationName } from "@sbfn/connectors/postgres/quotePostgresRelationName/quotePostgresRelationName.ts";
import { describe, expect, it, vi } from "vitest";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

function _makeFakeSql(): PostgresSql {
  const fakeSql = vi.fn() as unknown as PostgresSql;
  fakeSql.unsafe = vi.fn(identity);
  fakeSql.end = vi.fn(async () => {});
  return fakeSql;
}

describe("quotePostgresRelationName", () => {
  it("quotes the schema and the table as two separate identifiers", () => {
    expect(quotePostgresRelationName({
        sql: _makeFakeSql(),
        schemaName: "public",
        tableName: "orders",
      })).toBe(
      '"public"."orders"',
    );
  });

  it("keeps a dot inside a name as part of that one identifier", () => {
    expect(
      quotePostgresRelationName({
        sql: _makeFakeSql(),
        schemaName: "sales.eu",
        tableName: "orders.2024",
      }),
    ).toBe('"sales.eu"."orders.2024"');
  });

  it("doubles every embedded double quote so a name cannot close its own quoting", () => {
    expect(
      quotePostgresRelationName({
        sql: _makeFakeSql(),
        schemaName: "public",
        tableName: 'x"; drop table users; --',
      }),
    ).toBe('"public"."x""; drop table users; --"');
  });
});
