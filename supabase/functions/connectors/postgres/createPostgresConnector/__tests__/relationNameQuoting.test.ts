import { identity } from "@avandar/utils";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { describe, expect, it, vi } from "vitest";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

function _makeSavedConnectionAdminClient() {
  return {
    rpc: vi.fn(async () => {
      return { data: "hunter2", error: null };
    }),
    from: vi.fn(() => {
      const builder = {
        select: vi.fn(() => {
          return builder;
        }),
        eq: vi.fn(() => {
          return builder;
        }),
        maybeSingle: vi.fn(async () => {
          return {
            data: {
              connection_id: "44444444-4444-4444-4444-444444444444",
              workspace_id: "33333333-3333-3333-3333-333333333333",
              host: "8.8.8.8",
              port: 5432,
              database_name: "postgres",
              username: "reader",
              ssl_mode: "disable",
              vault_secret_id: "55555555-5555-5555-5555-555555555555",
            },
            error: null,
          };
        }),
      };
      return builder;
    }) as unknown as ConnectorContext["supabaseAdminClient"]["from"],
  };
}

/**
 * Records every `select * from` query's interpolated values, so a test can
 * see exactly which relation-name fragment reached the query.
 */
function _makeRecordingSql(selectFromValues: unknown[][]): PostgresSql {
  const fakeSql = vi.fn((strings: TemplateStringsArray, ...values) => {
    const queryText = strings.join(" ");
    if (queryText.includes("information_schema.tables")) {
      return Promise.resolve([{ table_type: "BASE TABLE" }]);
    }
    if (queryText.includes("select * from")) {
      selectFromValues.push(values);
    }
    return Promise.resolve([]);
  }) as unknown as PostgresSql;
  fakeSql.unsafe = vi.fn(identity);
  fakeSql.end = vi.fn(async () => {});
  return fakeSql;
}

describe("createPostgresConnector - relation name quoting", () => {
  it("previews a table whose name contains a dot as one quoted identifier", async () => {
    const selectFromValues: unknown[][] = [];
    const connector = createPostgresConnector({
      connectToPostgres: () => {
        return _makeRecordingSql(selectFromValues);
      },
    });
    const context: ConnectorContext = {
      workspaceId: "33333333-3333-3333-3333-333333333333",
      supabaseClient: undefined as unknown as ConnectorContext["supabaseClient"],
      supabaseAdminClient:
        _makeSavedConnectionAdminClient() as unknown as ConnectorContext["supabaseAdminClient"],
    };

    // `PostgresRelationId` escapes a dot inside a name as `\.`.
    await connector.previewRelation(
      context,
      "44444444-4444-4444-4444-444444444444",
      "public.orders\\.2024",
    );

    expect(selectFromValues[0]?.[0]).toBe('"public"."orders.2024"');
  });
});
