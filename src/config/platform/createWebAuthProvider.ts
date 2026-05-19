import { AuthClient } from "@/clients/AuthClient";
import type {
  AuthCredentials,
  AuthProvider,
  Session,
  Unsubscribe,
} from "$/platform/types/AuthProvider.types";

/*
 * Web-side adapter wrapping the existing `AuthClient` over the smaller
 * platform-agnostic `AuthProvider` interface. The legacy `AuthClient`
 * has a wider surface (password reset, email update, registration);
 * those stay reachable at their existing import path until consumers
 * are migrated individually.
 */

const listeners = new Set<(session: Session | null) => void>();

function notify(session: Session | null): void {
  listeners.forEach((cb) => {
    return cb(session);
  });
}

async function getSession(): Promise<Session | null> {
  const supabaseSession = await AuthClient.getCurrentSession();
  if (supabaseSession === undefined) {
    return null;
  }
  return {
    userId: supabaseSession.user.id,
    email: supabaseSession.user.email ?? "",
    accessToken: supabaseSession.access_token,
    accessTokenExpiresAt:
      (supabaseSession.expires_at ?? Math.floor(Date.now() / 1000) + 3600) *
      1000,
    mode: "online",
  };
}

async function signIn(credentials: AuthCredentials): Promise<Session> {
  if (credentials.kind !== "password") {
    throw new Error(
      "createWebAuthProvider: only password sign-in is currently supported.",
    );
  }
  const { user, session: supabaseSession } = await AuthClient.signIn({
    email: credentials.email,
    password: credentials.password,
  });
  const session: Session = {
    userId: user.id,
    email: user.email ?? credentials.email,
    accessToken: supabaseSession.access_token,
    accessTokenExpiresAt:
      (supabaseSession.expires_at ?? Math.floor(Date.now() / 1000) + 3600) *
      1000,
    mode: "online",
  };
  notify(session);
  return session;
}

async function signOut(): Promise<void> {
  await AuthClient.signOut();
  notify(null);
}

async function refreshIfNeeded(): Promise<void> {
  /*
   * `@supabase/supabase-js` refreshes automatically on its own
   * timer; no explicit poke needed from the platform-agnostic layer.
   * The method exists in the interface so the desktop side can
   * trigger a refresh when its in-memory access token is near
   * expiry. On web this is a no-op.
   */
}

function onAuthChange(
  callback: (session: Session | null) => void,
): Unsubscribe {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Builds the web {@link AuthProvider} adapter. Methods proxy through
 * the existing `AuthClient`; the wider `AuthClient` surface stays
 * reachable for unmigrated consumers.
 */
export function createWebAuthProvider(): AuthProvider {
  return {
    getSession,
    signIn,
    signOut,
    refreshIfNeeded,
    onAuthChange,
  };
}
