import { identity } from "@avandar/utils";
import { vi } from "vitest";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";
import type {
  PostgresQueryRunner,
  PostgresSql,
} from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/** The saved connection every connector test in this suite reads. */
export const SAVED_CONNECTION_ID = "44444444-4444-4444-4444-444444444444";

/**
 * A connector context whose admin client returns one saved connection to
 * `host` and decrypts its password, as `openSavedConnection` expects.
 */
export function makeSavedConnectionContext(host: string): ConnectorContext {
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
          host,
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
 * query's own text and its interpolated values, and runs a transaction's
 * queries against itself.
 */
export function makeFakeSql(
  respond: (queryText: string, values: unknown[]) => unknown,
): PostgresSql {
  const fakeSql = vi.fn(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      return respond(strings.join(" "), values);
    },
  ) as unknown as PostgresSql;
  fakeSql.unsafe = vi.fn(identity);
  // `begin` is generic in what `run` returns, which a `vi.fn` cannot be.
  fakeSql.begin = vi.fn(
    async (
      _options: string,
      run: (transaction: PostgresQueryRunner) => Promise<unknown>,
    ) => {
      return run(fakeSql);
    },
  ) as PostgresSql["begin"];
  fakeSql.end = vi.fn(async () => {});
  return fakeSql;
}

/**
 * Reads CSV bytes back as text. Through `FileReader` because the test
 * environment's jsdom `Blob` has no `text()` method.
 */
export function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result));
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsText(blob);
  });
}
