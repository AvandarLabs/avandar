import { createClient } from "@supabase/supabase-js";
import {
  E2E_PRIMARY_USER_EMAIL,
  E2E_PRIMARY_USER_PASSWORD,
} from "./e2e-credentials";

/**
 * Ensures the seeded primary test user exists in Supabase Auth. Requires a
 * service-role key and Supabase URL (local or remote).
 */
export async function ensureTestUser(): Promise<void> {
  const apiUrl = process.env.VITE_SUPABASE_API_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiUrl || !serviceRoleKey) {
    console.warn(
      "[e2e] Skipping ensureTestUser: set VITE_SUPABASE_API_URL (or " +
        "SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.development.",
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
    email: E2E_PRIMARY_USER_EMAIL,
    password: E2E_PRIMARY_USER_PASSWORD,
    email_confirm: true,
  });

  if (!error) {
    console.log(`[e2e] Created auth user ${E2E_PRIMARY_USER_EMAIL}`);
    return;
  }

  if (
    error.message.includes("already") ||
    error.message.includes("registered")
  ) {
    return;
  }

  throw new Error(`[e2e] ensureTestUser failed: ${error.message}`);
}
