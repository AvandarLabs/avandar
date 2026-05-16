/**
 * Platform-agnostic server API client.
 *
 * Covers two server-side surfaces today bridged by `@supabase/supabase-js`:
 *   - Postgres functions invoked via PostgREST (`supabase.rpc(...)`)
 *   - Edge Functions (`supabase.functions.invoke(...)`)
 *
 * On web this is a thin wrapper over the existing `APIClient.ts` (for Edge
 * Functions) and a `supabase.rpc(...)` passthrough. On desktop (Phase 2+)
 * this is an IPC client; in Phase 1 the desktop factory throws.
 *
 * The argument and return types here are intentionally `unknown`-shaped at
 * the interface level. Concrete adapters preserve full typed inference at
 * their call sites by accepting and returning the same types the underlying
 * Supabase client / `APIClient.ts` already declare. Phase 2 may tighten this
 * with generics derived from the registered Supabase `Database` and the
 * `API` route schema in `src/clients/APIClient.ts`; the interface intentionally
 * stays loose for Phase 1 so the `packages/shared/` package does not have to
 * import from `src/`.
 */
export interface ServerApiClient {
  /**
   * Invoke a Postgres function exposed via PostgREST (Supabase `.rpc(...)`).
   *
   * @param name - RPC name as registered in Supabase / Postgres.
   * @param args - Argument record passed to the RPC.
   * @returns The RPC payload, typed by the caller via the generic parameter.
   */
  rpc<TResult = unknown>(
    name: string,
    args?: Readonly<Record<string, unknown>>,
  ): Promise<TResult>;

  /**
   * Invoke a Supabase Edge Function (`supabase.functions.invoke(...)`).
   *
   * Phase 1 web-side adapter delegates to `APIClient.sendHTTPRequest` so the
   * full route-schema typing in `src/clients/APIClient.ts` continues to apply
   * at the call site. The interface keeps the request/response as `unknown`
   * to avoid a `packages/shared/` → `src/` dependency.
   *
   * @param request - Structured request describing route, method, params, body.
   * @returns The function payload, typed by the caller via the generic parameter.
   */
  invokeFunction<TResult = unknown>(
    request: ServerApiFunctionRequest,
  ): Promise<TResult>;
}

/**
 * Structured Edge Function request. Mirrors the shape `APIClient.sendHTTPRequest`
 * already accepts so the browser-backed adapter is a direct passthrough.
 */
export type ServerApiFunctionRequest = {
  route: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  pathParams?: Readonly<Record<string, string | number>>;
  queryParams?: Readonly<Record<string, unknown>>;
  body?: unknown;
};
