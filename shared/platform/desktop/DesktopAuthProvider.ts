/*
 * Webview-side adapter that satisfies the platform-agnostic `AuthProvider`
 * interface by forwarding every call to the Bun-main auth IPC handlers
 * (`apps/desktop/main/ipc/registerAuthHandlers/registerAuthHandlers.ts`).
 *
 * Ships in isolation for now: no React code imports it yet. Soon, the
 * `PlatformProvider` + `usePlatform()` plumbing will pick this adapter
 * for desktop builds and the existing browser/Supabase one for web.
 *
 * `onAuthChange` is local-only in this build — listeners fire in
 * response to `signIn` / `signOut` from the same webview process, not
 * in response to keychain edits from another tab or process. The web
 * adapter has the same shape for symmetry; cross-process notification
 * isn't on the design's risk register.
 */

import { callIpc } from "$/platform/ipc/client";
import { AuthContracts } from "$/platform/ipc/contracts/AuthContracts";
import type {
  AuthCredentials,
  AuthProvider,
  Session,
  Unsubscribe,
} from "$/platform/types/AuthProvider.types";

const listeners = new Set<(session: Session | null) => void>();

function notify(session: Session | null): void {
  listeners.forEach((cb) => {
    return cb(session);
  });
}

async function getSession(): Promise<Session | null> {
  const reply = await callIpc(AuthContracts.getSession, {});
  return reply.session;
}

async function signIn(credentials: AuthCredentials): Promise<Session> {
  if (credentials.kind !== "password") {
    throw new Error(
      "DesktopAuthProvider only supports password sign-in for now",
    );
  }
  const reply = await callIpc(AuthContracts.signIn, {
    email: credentials.email,
    password: credentials.password,
  });
  const session: Session = {
    userId: reply.userId,
    email: reply.email,
    accessToken: reply.accessToken,
    accessTokenExpiresAt: reply.accessTokenExpiresAt,
    mode: "online",
  };
  notify(session);
  return session;
}

async function signOut(): Promise<void> {
  await callIpc(AuthContracts.signOut, {});
  notify(null);
}

async function refreshIfNeeded(): Promise<void> {
  await callIpc(AuthContracts.refreshIfNeeded, {});
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
 * Desktop {@link AuthProvider} implementation that routes through IPC to
 * the Bun-main process. The refresh token lives in the OS keychain; only
 * the short-lived access token crosses the IPC boundary.
 */
export const DesktopAuthProvider: AuthProvider = {
  getSession,
  signIn,
  signOut,
  refreshIfNeeded,
  onAuthChange,
};
