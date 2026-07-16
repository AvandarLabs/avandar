import { ServerApiSessionRefresher } from "@clients";
import { notifyExpiredSession } from "@ui";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";

/**
 * Wire up the app's reaction to an unrecoverable session expiry (a `401` that a
 * token refresh could not fix). Called once at startup.
 *
 * On expiry we show the "session expired" toast and clear the stale local
 * session. Clearing the session (rather than routing to `/signin` directly)
 * lets the existing `SIGNED_OUT` → `useAuth` → `_auth` `beforeLoad` machinery
 * do the redirect, which preserves the return-to URL. We deliberately do not go
 * through `AuthClient.signOut` so this is not recorded as a manual sign-out and
 * the redirect keeps its `redirect` search param.
 */
export function registerSessionExpiredHandler(): void {
  ServerApiSessionRefresher.setOnExpired(() => {
    notifyExpiredSession();
    void AvaSupabase.db().auth.signOut({ scope: "local" });
  });
}
