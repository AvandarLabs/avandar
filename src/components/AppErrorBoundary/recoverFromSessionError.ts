import { AvaSupabase } from "$/db/supabase/AvaSupabase";

/**
 * sessionStorage key holding the timestamp of the last auto-recovery attempt.
 */
const RECOVERY_TIMESTAMP_KEY = "ava:auth-recovery-ts";

/**
 * Window within which a second session failure after an auto-recovery is
 * treated as a loop (the redirect landed and crashed again) rather than a new,
 * independent expiry.
 */
const RECOVERY_LOOP_WINDOW_MS = 15_000;

/**
 * Whether an auto-recovery was attempted within the last few seconds. If so,
 * the redirect did not clear the failure and we are looping, so the caller
 * should show a manual recovery screen instead of silently redirecting again.
 *
 * @returns `true` if a recovery attempt is still within the loop window.
 */
export function isSessionRecoveryLooping(): boolean {
  try {
    const storedTimestamp = sessionStorage.getItem(RECOVERY_TIMESTAMP_KEY);
    if (storedTimestamp === null) {
      return false;
    }
    const lastAttemptMs = Number(storedTimestamp);
    return (
      Number.isFinite(lastAttemptMs) &&
      Date.now() - lastAttemptMs < RECOVERY_LOOP_WINDOW_MS
    );
  } catch {
    // sessionStorage unavailable; assume not looping so recovery can proceed.
    return false;
  }
}

/**
 * Build the sign-in URL, preserving the current location as a `redirect` param
 * so the user returns where they were once they re-authenticate. Skips the
 * param when already on `/signin` to avoid a self-referential redirect.
 *
 * @returns The relative sign-in URL to navigate to.
 */
function _buildSignInUrl(): string {
  const current = window.location.pathname + window.location.search;
  if (!current || current === "/" || current.startsWith("/signin")) {
    return "/signin";
  }
  return `/signin?redirect=${encodeURIComponent(current)}`;
}

/**
 * Clear the local Supabase session and send the user to sign-in. Self-contained
 * and dependency-free: it does not call any authenticated endpoint, so it
 * cannot re-trigger the failure it is recovering from. Records a timestamp so a
 * repeated crash right after the redirect can be detected as a loop (see
 * {@link isSessionRecoveryLooping}) and fall back to a manual screen.
 */
export async function recoverFromSessionError(): Promise<void> {
  try {
    sessionStorage.setItem(RECOVERY_TIMESTAMP_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable; loop detection is best-effort.
  }

  try {
    await AvaSupabase.db().auth.signOut({ scope: "local" });
  } catch {
    // Fall through to the manual clear below if signOut itself throws (e.g. the
    // client could not initialize).
  }

  try {
    // Belt-and-suspenders: drop any persisted Supabase session directly, in
    // case signOut could not remove it.
    Object.keys(localStorage)
      .filter((key) => {
        return key.startsWith("sb-") && key.endsWith("-auth-token");
      })
      .forEach((key) => {
        localStorage.removeItem(key);
      });
  } catch {
    // localStorage unavailable; nothing more we can do here.
  }

  // Full-page navigation so the app re-bootstraps from a clean state (and picks
  // up a newer bundle if one has been deployed).
  window.location.assign(_buildSignInUrl());
}

/**
 * Harder reset for a client wedged on stale cached assets (e.g. a service
 * worker still serving an old bundle that ships a revoked key): unregister all
 * service workers and delete all Cache Storage, then run the standard session
 * recovery. Used by the manual "Reset app" action when a plain sign-in redirect
 * keeps looping.
 */
export async function resetAppAndRecover(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => {
          return registration.unregister();
        }),
      );
    }
  } catch {
    // Ignore; proceed to cache clear + recovery regardless.
  }

  try {
    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map((cacheKey) => {
          return caches.delete(cacheKey);
        }),
      );
    }
  } catch {
    // Ignore; proceed to recovery regardless.
  }

  await recoverFromSessionError();
}
