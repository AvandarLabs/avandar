import { createClient } from "@supabase/supabase-js";
import {
  tryGetSupabaseServiceRoleKeyFromEnv,
  tryGetSupabaseUrlFromEnv,
} from "../helpers/supabaseEnv";

/**
 * Ensures a Supabase Auth user exists (idempotent). Requires service role and
 * Supabase URL in env.
 *
 * @param options.email Auth email.
 * @param options.password Auth password.
 */
export async function ensureAuthUserExists(options: {
  email: string;
  password: string;
}): Promise<void> {
  const apiUrl = tryGetSupabaseUrlFromEnv();
  const serviceRoleKey = tryGetSupabaseServiceRoleKeyFromEnv();

  if (!apiUrl || !serviceRoleKey) {
    console.warn(
      "[e2e] Skipping ensureAuthUserExists: set VITE_SUPABASE_API_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.development.",
    );
    return;
  }

  const adminClient = createClient(apiUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await adminClient.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: true,
  });

  if (!error) {
    console.log(`[e2e] Created auth user ${options.email}`);
    return;
  }

  if (
    error.message.includes("already") ||
    error.message.includes("registered")
  ) {
    return;
  }

  throw new Error(`[e2e] ensureAuthUserExists failed: ${error.message}`);
}
