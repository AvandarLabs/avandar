import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKeyFromEnv,
  getSupabaseUrlFromEnv,
} from "./supabaseEnv";
import type { SupabaseClient } from "@supabase/supabase-js";

export {
  getSupabaseAnonKeyFromEnv,
  getSupabaseUrlFromEnv,
} from "./supabaseEnv";

const E2E_SUPABASE_CLIENT_OPTIONS = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
} as const;

/**
 * Supabase JS client with the anon key (RLS applies as the signed-in user).
 */
export function createE2ESupabaseAnonClient(): SupabaseClient {
  return createClient(
    getSupabaseUrlFromEnv(),
    getSupabaseAnonKeyFromEnv(),
    E2E_SUPABASE_CLIENT_OPTIONS,
  );
}

/**
 * Anon client signed in as a test user (for API-level RLS checks in
 * Playwright).
 */
export async function createE2ESupabaseViewerClient(options: {
  email: string;
  password: string;
}): Promise<SupabaseClient> {
  const client = createE2ESupabaseAnonClient();

  const { error } = await client.auth.signInWithPassword({
    email: options.email,
    password: options.password,
  });

  if (error) {
    throw new Error(`viewer sign-in failed: ${error.message}`);
  }

  return client;
}
