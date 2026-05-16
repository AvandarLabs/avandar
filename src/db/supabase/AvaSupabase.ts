import { registerWebDbClient } from "@clients/webDbClientRegistry.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "$/types/database.types";

/**
 * Naming this `SupabaseDBClient` instead of `SupabaseClient` so it doesn't
 * get mixed up with `SupabaseClient` from `@supabase/supabase-js` during
 * automatic imports.
 */
const supabaseDBClient: SupabaseClient<Database> = createClient(
  import.meta.env.VITE_SUPABASE_API_URL ?? "",
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
);

// Phase 1 platform-aware factories (`createRdbCrudClient`,
// `createServerApiClient`) read the registered Supabase client out of
// @avandar/clients to avoid a packages/shared/ → src/ direct import. Register
// once at module load; the client lifetime matches the singleton in `AvaSupabase`.
registerWebDbClient(supabaseDBClient);

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
