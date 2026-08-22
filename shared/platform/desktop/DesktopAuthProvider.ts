import type {
  AuthCredentials,
  AuthProvider,
  Session,
  Unsubscribe,
} from "$/platform/types/AuthProvider.types.ts";

import { callIpc } from "$/platform/ipc/client.ts";
import { AuthContracts } from "$/platform/ipc/contracts/AuthContracts.ts";

const listeners = new Set<(session: Session | undefined) => void>();

function notify(session: Session | undefined): void {
  listeners.forEach((cb) => {
    return cb(session);
  });
}

async function getSession(): Promise<Session | undefined> {
  const reply = await callIpc(AuthContracts.getSession, {});
  return reply.session ?? undefined;
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
  notify(undefined);
}

async function refreshIfNeeded(): Promise<void> {
  await callIpc(AuthContracts.refreshIfNeeded, {});
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
 * Desktop {@link AuthProvider} implementation that routes through IPC to
 * the Bun-main process. The refresh token lives in the OS keychain; only
 * the short-lived access token crosses the IPC boundary. Auth-change
 * listeners observe sign-in and sign-out calls from this webview process.
 */
export const DesktopAuthProvider: AuthProvider = {
  getSession,
  signIn,
  signOut,
  refreshIfNeeded,
  onAuthChange,
};
