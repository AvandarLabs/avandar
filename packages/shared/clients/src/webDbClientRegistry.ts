import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegisteredSupabaseDatabase } from "@clients/Register.types.ts";

/**
 * Shared registry for the web app's Supabase client. Phase 1 platform-aware
 * factories (`createRdbCrudClient`, `createBrowserServerApiClient`) read the
 * registered client to dispatch CRUD and server-API calls without the
 * `packages/shared/` → `src/` direct import that would otherwise be needed.
 *
 * Bootstrapped once in `src/db/supabase/AvaSupabase.ts`. Phase 2 will either
 * remove this registry (when desktop has its own RDB/IPC backends) or migrate
 * to a small per-platform service-locator object.
 */

let registered:
  | SupabaseClient<RegisteredSupabaseDatabase>
  | null = null;

/**
 * Register the web app's Supabase client. Call exactly once at app bootstrap,
 * immediately after constructing the client. Passing `null` clears the
 * registration (used in tests).
 *
 * @param client - The Supabase client instance, or `null` to unregister.
 */
export function registerWebDbClient(
  client: SupabaseClient<RegisteredSupabaseDatabase> | null,
): void {
  registered = client;
}

/**
 * Retrieve the registered web Supabase client. Used by Phase 1 web-side
 * adapters that need to dispatch CRUD or server-API calls.
 *
 * @returns The registered client.
 * @throws Error When no client has been registered.
 */
export function getRegisteredWebDbClient(): SupabaseClient<RegisteredSupabaseDatabase> {
  if (!registered) {
    throw new Error(
      "No web db client registered. " +
        "Call registerWebDbClient(AvaSupabase.DB) during app bootstrap.",
    );
  }
  return registered;
}
