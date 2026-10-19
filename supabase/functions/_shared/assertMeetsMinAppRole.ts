import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { FORBIDDEN } from "@sbfn/_shared/httpCodes.ts";
import type { Database } from "$/types/database.types.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

type AppType = Database["public"]["Enums"]["app_type"];
type RoleLevel = Database["public"]["Enums"]["role_level"];

/**
 * Confirms the caller meets at least `minRole` on `app` for `workspaceId`,
 * evaluated against the **user-scoped** client (never `SupabaseAdmin`) so
 * `util__auth_user_meets_min_app_role`'s own `auth.uid()` read reflects the
 * caller's own session, not the service role.
 *
 * No existing edge function calls this RPC today - `google-sheets` never
 * touches `SupabaseAdmin` at all, since it only ever reads the caller's own
 * Google tokens. This is the first edge-function caller of this check, so
 * there is no existing precedent to copy; this is the pattern to copy going
 * forward for any future connector that needs the same gate.
 *
 * Throws `AvaHTTPError` (403) rather than returning a boolean so every
 * route can call this as its first line and let `responseError` translate
 * the throw, instead of every caller re-implementing the same `if`.
 */
export async function assertMeetsMinAppRole(options: {
  supabaseClient: AvaSupabaseClient;
  workspaceId: string;
  app: AppType;
  minRole: RoleLevel;
}): Promise<void> {
  const { supabaseClient, workspaceId, app, minRole } = options;

  const { data, error } = await supabaseClient.rpc(
    "util__auth_user_meets_min_app_role",
    {
      p_workspace_id: workspaceId,
      p_app: app,
      p_min_role: minRole,
    },
  );

  if (error) {
    throw new AvaHTTPError(
      `Failed to check workspace role: ${error.message}`,
      FORBIDDEN,
    );
  }

  if (!data) {
    throw new AvaHTTPError(
      `This action requires at least the '${minRole}' role on '${app}' in this workspace`,
      FORBIDDEN,
    );
  }
}
