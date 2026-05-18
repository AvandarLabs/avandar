/**
 * Minimal Supabase REST wrapper used by the snapshot bootstrap.
 *
 * Lives in Bun main so the webview never sees the anon key. Phase 3's
 * sync engine will reuse the same surface; until then, this is the
 * only Supabase-talking code path outside the webview.
 */
export type SupabaseRestClient = {
  /**
   * Page through every row of `table` from Supabase. Uses the REST
   * range header for paging so we never hit Supabase's max-row cap.
   *
   * @param table - Public-schema table name.
   * @param accessToken - User access token (Bearer); the anon key is
   *   sent alongside as `apikey`.
   * @returns Every row in the table as Supabase REST returned it
   *   (JS-typed: booleans are real booleans, `jsonb` columns are
   *   already parsed JS objects).
   */
  selectAll: (
    table: string,
    accessToken: string,
  ) => Promise<ReadonlyArray<Record<string, unknown>>>;
};

/**
 * Build a {@link SupabaseRestClient} bound to a project URL + anon
 * key. Reads `AVA_SUPABASE_URL` / `AVA_SUPABASE_ANON_KEY` by default;
 * tests can override either via the `overrides` argument.
 */
export function createSupabaseRestClient(
  overrides: { url?: string; anonKey?: string; pageSize?: number } = {},
): SupabaseRestClient {
  const url = overrides.url ?? process.env.AVA_SUPABASE_URL ?? "";
  const anonKey =
    overrides.anonKey ?? process.env.AVA_SUPABASE_ANON_KEY ?? "";
  const pageSize = overrides.pageSize ?? 1000;

  if (!url || !anonKey) {
    throw new Error(
      "AVA_SUPABASE_URL and AVA_SUPABASE_ANON_KEY must be set for the desktop snapshot bootstrap",
    );
  }

  return {
    async selectAll(table, accessToken) {
      const all: Array<Record<string, unknown>> = [];
      let from = 0;
      // Loop until a page comes back shorter than pageSize.
      for (;;) {
        const to = from + pageSize - 1;
        const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            Range: `${from}-${to}`,
            "Range-Unit": "items",
          },
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(
            `Supabase selectAll ${table} failed (range ${from}-${to}): ` +
              `${res.status} ${body}`,
          );
        }
        const page = (await res.json()) as Array<Record<string, unknown>>;
        all.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  };
}
