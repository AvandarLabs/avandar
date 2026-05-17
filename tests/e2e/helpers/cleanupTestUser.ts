import { createClient } from "@supabase/supabase-js";
import {
  tryGetSupabaseServiceRoleKeyFromEnv,
  tryGetSupabaseUrlFromEnv,
} from "./supabaseEnv";
import type { Database } from "../../../shared/types/database.types";

/**
 * Deletes a Supabase user by email. We use this function to clean up after
 * tests that create new test users.
 *
 * **This function must be called explicitly at the end of the test if a test
 * user was created.** It does not get called automatically by Playwright.
 *
 * This function is a no-op if Supabase credentials are missing, the user does
 * not exist, or the deletion fails.
 */
export async function cleanupTestUser(email: string): Promise<void> {
  const apiUrl = tryGetSupabaseUrlFromEnv();
  const serviceRoleKey = tryGetSupabaseServiceRoleKeyFromEnv();

  if (!apiUrl || !serviceRoleKey) {
    console.warn(
      "[e2e] Skipping deleteAuthUserByEmail: set VITE_SUPABASE_API_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
    );
    return;
  }

  const adminClient = createClient<Database>(apiUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userId, error: rpcError } = await adminClient.rpc(
    "util__get_user_id_by_email",
    { p_email: email },
  );

  if (rpcError) {
    console.warn(
      `[e2e] deleteAuthUserByEmail: could not resolve user id: ` +
        `${rpcError.message}`,
    );
    return;
  }

  if (userId === null || userId === undefined || userId === "") {
    return;
  }

  const { error: deleteError } =
    await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.warn(
      `[e2e] deleteAuthUserByEmail: failed to delete user: ` +
        `${deleteError.message}`,
    );
    return;
  }

  console.log(`[e2e] Deleted auth user ${email}`);
}
