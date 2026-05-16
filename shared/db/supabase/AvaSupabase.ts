import { createModule } from "@modules/createModule";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAPIURL } from "$/env/getSupabaseAPIURL.ts";
import { getSupabasePublicAPIKey } from "$/env/getSupabasePublicAPIKey.ts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types.ts";

let cachedClient: AvaSupabaseDBClient | undefined;

/**
 * Global namespace for interacting with Supabase using the public (anon) API
 * key. Safe to call from any platform (web, desktop renderer, desktop Bun
 * main, Node scripts, Deno edge functions); the underlying env getters route
 * to the correct source per runtime.
 *
 * @see {@link https://supabase.com/docs/reference/javascript/start|Supabase JS Docs}
 */
export const AvaSupabase = createModule("AvaSupabase", {
  builder: () => {
    return {
      /**
       * Returns the singleton Supabase DB client, constructing it on first
       * call. Subsequent calls return the cached instance so consumers share
       * a single auth/session state and connection pool.
       *
       * @returns The shared Supabase DB client.
       */
      db: (): AvaSupabaseDBClient => {
        if (!cachedClient) {
          cachedClient = createClient(
            getSupabaseAPIURL(),
            getSupabasePublicAPIKey(),
          );
        }
        return cachedClient;
      },

      /**
       * Returns the Supabase API URL for the current environment.
       *
       * @returns The Supabase API URL.
       */
      getAPIURL: (): string => {
        return getSupabaseAPIURL();
      },

      /**
       * Returns the Supabase Edge Functions URL for the current environment.
       *
       * @returns The Supabase Edge Functions URL (`${apiURL}/functions/v1`).
       */
      getEdgeFunctionsURL: (): string => {
        return `${getSupabaseAPIURL()}/functions/v1`;
      },
    };
  },
});
