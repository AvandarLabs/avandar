import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../shared/types/database.types";

/**
 * Deletes a Supabase Auth user by email. No-op when credentials are missing,
 * the user does not exist, or deletion fails (warnings only — does not throw).
 * Uses the same service-role env vars as `ensureTestUser`.
 */
export async function deleteAuthUserByEmail(email: string): Promise<void> {
  const apiUrl = process.env.VITE_SUPABASE_API_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiUrl || !serviceRoleKey) {
    console.warn(
      "[e2e] Skipping deleteAuthUserByEmail: set VITE_SUPABASE_API_URL " +
        "(or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
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
