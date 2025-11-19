import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/** The names of the tables in the `public` schema of the database. */
export type DatabaseTableNames = keyof Database["public"]["Tables"];

/**
 * Naming this `SupabaseDBClient` instead of `SupabaseClient` so it doesn't
 * get mixed up with `SupabaseClient` from `@supabase/supabase-js` during
 * automatic imports.
 */
const supabaseDBClient: SupabaseClient<Database> = createClient(
  import.meta.env.VITE_SUPABASE_API_URL ?? "",
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
);

export const AvaSupabase = {
  /**
   * A global client for interacting with Supabase.
   * @see {@link https://supabase.com/docs/reference/javascript/start|Supabase JS Docs}
   */
  DB: supabaseDBClient,

  getAPIURL: (): string => {
    const supabaseAPIURL = import.meta.env.VITE_SUPABASE_API_URL;
    if (!supabaseAPIURL) {
      throw new Error(
        "VITE_SUPABASE_API_URL is not set in the environment variables",
      );
    }
    return supabaseAPIURL;
  },

  getEdgeFunctionsURL: (): string => {
    const supabaseAPIURL = AvaSupabase.getAPIURL();
    return `${supabaseAPIURL}/functions/v1`;
  },
};

export type GetSupabaseClientOptions<DB> =
  // Get the client options from the internal Supabase object, if it is set
  DB extends { __InternalSupabase: { PostgrestVersion: string } } ?
    DB["__InternalSupabase"]
  : // otherwise default to 12
    { PostgrestVersion: "12" };

/**
 * An admin client for interacting with Supabase. This should only be used
 * when seeding the database.
 * @returns An admin client for interacting with Supabase.
 */
export function createSupabaseAdminClient(
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient(
    import.meta.env.VITE_SUPABASE_API_URL ?? "",
    serviceRoleKey,
  );
}
