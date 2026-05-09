import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "$/types/database.types.ts";

/**
 * An admin client for interacting with Supabase. This should only be used
 * when seeding the database.
 *
 * @param options Optional overrides for URL and service role key.
 * @returns An admin client for interacting with Supabase.
 */
export function createSupabaseAdminClient(
  options: {
    apiUrl?: string;
    serviceRoleKey?: string;
  } = {},
): SupabaseClient<Database> {
  const {
    apiUrl = process.env.SUPABASE_URL ?? "",
    serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  } = options;

  if (!apiUrl) {
    throw new Error("SUPABASE_URL is not set.");
  }

  if (!/^https?:\/\//i.test(apiUrl)) {
    throw new Error(
      "SUPABASE_URL must be an http(s) URL. If the shell has a valid URL but you still see this, vite-node may not be seeing process.env.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  return createClient(apiUrl, serviceRoleKey);
}
