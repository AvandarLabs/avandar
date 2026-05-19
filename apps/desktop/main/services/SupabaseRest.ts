import { createClient } from "@supabase/supabase-js";

/**
 * Minimal "read every row of a table" surface used by the snapshot
 * bootstrap. Lives in Bun main so the webview never sees the anon key.
 * For now, this is the only Supabase-talking code path outside the
 * webview; the sync engine will eventually reuse the same surface.
 */
export type SupabaseRestClient = {
  /**
   * Page through every row of `table` from Supabase under the user's
   * JWT (so RLS scopes the result to that user's data).
   *
   * @param table - Public-schema table name.
   * @param accessToken - User access token (passed as `Authorization:
   *   Bearer …` on every request).
   * @returns Every row in the table as Supabase JS returned it
   *   (booleans are real booleans, `jsonb` columns are already parsed
   *   JS objects).
   */
  selectAll: (
    table: string,
    accessToken: string,
  ) => Promise<ReadonlyArray<Record<string, unknown>>>;
};

type CreateSupabaseRestClientOverrides = {
  url?: string;
  anonKey?: string;
  pageSize?: number;
};

/**
 * Build a {@link SupabaseRestClient} backed by `@supabase/supabase-js`
 * (the same library the web bundle uses). Reads
 * `VITE_SUPABASE_API_URL` / `VITE_SUPABASE_ANON_KEY` by default; tests
 * inject a fake {@link SupabaseRestClient} directly rather than going
 * through this factory.
 */
export function createSupabaseRestClient(
  overrides: Readonly<CreateSupabaseRestClientOverrides> = {},
): SupabaseRestClient {
  const url = overrides.url ?? process.env.VITE_SUPABASE_API_URL ?? "";
  const anonKey = overrides.anonKey ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const pageSize = overrides.pageSize ?? 1000;

  if (!url || !anonKey) {
    throw new Error(
      "VITE_SUPABASE_API_URL and VITE_SUPABASE_ANON_KEY must be set for the desktop snapshot bootstrap",
    );
  }

  return {
    async selectAll(table, accessToken) {
      // Per-call client so the user's JWT lives in this request's
      // headers without polluting the Bun-main process's broader auth
      // state. `persistSession: false` because there is no browser
      // storage to write to in Bun main.
      const client = createClient(url, anonKey, {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const all: Array<Record<string, unknown>> = [];
      let from = 0;
      // Paging loop: termination depends on the server's response
      // size, so this is the exit-early-break exception, not a missed
      // `forEach`.
      for (;;) {
        const to = from + pageSize - 1;
        const { data, error } = await client
          // The synced tables are listed in `SYNCABLE_TABLES` as plain
          // strings, not literal types in the registered Supabase
          // database schema, so the `.from` argument is widened.
          .from(table)
          .select("*")
          .range(from, to);
        if (error) {
          throw new Error(
            `Supabase selectAll ${table} failed (range ${from}-${to}): ` +
              `${error.message}`,
          );
        }
        const page = (data ?? []) as Array<Record<string, unknown>>;
        all.push(...page);
        if (page.length < pageSize) {
          break;
        }
        from += pageSize;
      }
      return all;
    },
  };
}
