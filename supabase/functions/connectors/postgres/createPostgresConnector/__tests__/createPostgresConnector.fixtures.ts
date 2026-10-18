import { identity } from "@avandar/utils";
import { vi } from "vitest";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";
import type { PostgresSql } from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/** The saved connection every connector test in this suite reads. */
export const SAVED_CONNECTION_ID = "44444444-4444-4444-4444-444444444444";

/**
 * A connector context whose admin client returns one saved connection to
 * `host` and decrypts its password, as `openSavedConnection` expects.
 */
export function makeSavedConnectionContext(
  options: Readonly<{ host: string }>,
): ConnectorContext {
  const builder = {
    select: vi.fn(() => {
      return builder;
    }),
    eq: vi.fn(() => {
      return builder;
    }),
    update: vi.fn(() => {
      return builder;
    }),
    maybeSingle: vi.fn(async () => {
      return {
        data: {
          connection_id: SAVED_CONNECTION_ID,
          workspace_id: "33333333-3333-3333-3333-333333333333",
          host: options.host,
          port: 5432,
          database_name: "postgres",
          username: "reader",
          ssl_mode: "require",
          vault_secret_id: "55555555-5555-5555-5555-555555555555",
        },
        error: null,
      };
    }),
  };
  const supabaseAdminClient = {
    rpc: vi.fn(async () => {
      return { data: "hunter2", error: null };
    }),
    from: vi.fn(() => {
      return builder;
    }),
  };
  return {
    workspaceId: "33333333-3333-3333-3333-333333333333",
    supabaseClient: undefined as unknown as ConnectorContext["supabaseClient"],
    supabaseAdminClient:
      supabaseAdminClient as unknown as ConnectorContext["supabaseAdminClient"],
  };
}

/**
 * A fake connection that answers each query through `respond`, keyed on the
 * query's own text, and runs a transaction's queries against itself.
 */
export function makeFakeSql(
  respond: (queryText: string) => unknown,
): PostgresSql {
  const fakeSql = vi.fn((strings: TemplateStringsArray) => {
    return respond(strings.join(" "));
  }) as unknown as PostgresSql;
  fakeSql.unsafe = vi.fn(identity);
  fakeSql.begin = vi.fn(
    async (_options: string, run: (transaction: PostgresSql) => unknown) => {
      return run(fakeSql);
    },
  ) as unknown as PostgresSql["begin"];
  fakeSql.end = vi.fn(async () => {});
  return fakeSql;
}
