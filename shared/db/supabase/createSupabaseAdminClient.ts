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
  return createClient(apiUrl, serviceRoleKey);
}
