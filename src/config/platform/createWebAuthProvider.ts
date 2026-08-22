import { AuthClient } from "@/clients/AuthClient/AuthClient";
import type {
  AuthCredentials,
  AuthProvider,
  Session,
  Unsubscribe,
} from "$/platform/types/AuthProvider.types";

const listeners = new Set<(session: Session | undefined) => void>();

function notify(session: Session | undefined): void {
  listeners.forEach((cb) => {
    return cb(session);
  });
}

async function getSession(): Promise<Session | undefined> {
  const supabaseSession = await AuthClient.getCurrentSession();
  if (supabaseSession === undefined) {
    return undefined;
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
  notify(undefined);
}

async function refreshIfNeeded(): Promise<void> {
  // Supabase JS refreshes automatically on its own timer. The method remains
  // in the shared interface because desktop refreshes its in-memory token.
}

function onAuthChange(
  callback: (session: Session | undefined) => void,
): Unsubscribe {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Builds the web {@link AuthProvider} adapter over the existing `AuthClient`.
 * Password reset, email update, and registration remain available directly
 * from the wider client surface.
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
