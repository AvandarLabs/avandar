import type { Session } from "@supabase/supabase-js";

import { AvaSupabase } from "$/db/supabase/AvaSupabase.ts";

/**
 * Thrown when a server call comes back `401 Unauthorized` and a session
 * refresh could not produce a usable session (the refresh token is gone,
 * expired, or itself rejected). Callers should treat this as "the session is
 * dead" rather than a transient error: the handler registered via
 * {@link ServerApiSessionRefresher.setOnExpired} has already been invoked to
 * drive the sign-out / redirect UX.
 */
export class SessionExpiredError extends Error {
  constructor(route: string) {
    super(`Session expired while calling '${route}'. Please sign in again.`);
    this.name = "SessionExpiredError";
  }
}

/**
 * App-registered reaction to an unrecoverable session expiry (show a toast,
 * clear the local session, redirect to sign-in). Lives here so the
 * platform-shared layer can signal the web/desktop app layer without importing
 * its UI or router. Invoked at most once per failed refresh (see
 * {@link ServerApiSessionRefresher.refreshOnce}), so concurrent 401s do not
 * stack duplicate toasts.
 */
let onSessionExpired: (() => void) | undefined = undefined;

/**
 * The in-flight refresh, shared by every caller that hits a 401 while a
 * refresh is already running. This is the single-flight guard: N concurrent
 * 401s trigger exactly one call to Supabase's token endpoint, and all N await
 * the same result. Reset to `undefined` once settled so a genuinely later
 * expiry can refresh again.
 *
 * Deliberately module-level, not per-client: `createServerApiClient()` is not
 * memoized and every domain client instantiates its own adapter, so instance
 * state would give each one its own lock and fire one refresh per client on a
 * concurrent-401 storm. A single module-global owner keeps the single flight
 * shared across every adapter (browser + IPC) and every domain client.
 */
let inFlightRefresh: Promise<Session | undefined> | undefined = undefined;

async function _doRefresh(): Promise<Session | undefined> {
  const { data, error } = await AvaSupabase.db().auth.refreshSession();
  if (error || !data.session) {
    // Unrecoverable: signal the app layer exactly once for this attempt.
    onSessionExpired?.();
    return undefined;
  }
  return data.session;
}

/**
 * Module-level client that owns the single-flight Supabase session refresh the
 * `ServerApi` adapters run when an edge-function call returns `401`. Exposed as
 * a singleton object (call `ServerApiSessionRefresher.refreshOnce()`) so the
 * process-global refresh lock and expiry handler stay shared across every
 * adapter and domain client instead of being duplicated per client instance.
 */
export const ServerApiSessionRefresher = {
  /**
   * Register the handler run when a session refresh fails unrecoverably. The
   * app layer wires this up once at startup. Pass `undefined` to clear it
   * (used by tests).
   *
   * @param handler - The reaction to run, or `undefined` to unregister.
   */
  setOnExpired: (handler: (() => void) | undefined): void => {
    onSessionExpired = handler;
  },

  /**
   * Refresh the Supabase session at most once across all concurrent callers.
   *
   * The access token our clients hold may be time-valid yet signed by a retired
   * JWT signing key, so Supabase's own auto-refresh timer will not fire early;
   * an explicit refresh on a 401 is what migrates the client onto a token
   * signed by the current key. The refresh token is opaque and unaffected by
   * signing-key rotation, so this succeeds as long as the session itself is
   * still alive.
   *
   * @returns The fresh session, or `undefined` if the session could not be
   * refreshed (in which case the {@link ServerApiSessionRefresher.setOnExpired}
   * handler has been invoked).
   */
  refreshOnce: (): Promise<Session | undefined> => {
    if (inFlightRefresh === undefined) {
      inFlightRefresh = _doRefresh().finally(() => {
        inFlightRefresh = undefined;
      });
    }
    return inFlightRefresh;
  },
};
