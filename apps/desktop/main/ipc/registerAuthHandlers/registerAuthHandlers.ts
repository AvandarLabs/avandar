import { AuthContracts } from "$/platform/ipc/contracts/AuthContracts";
import type { Keychain } from "../../services/createKeychain/createKeychain";
import type { IpcServer } from "../createIpcServer/createIpcServer";

/*
 * Keychain identifiers for the Avandar desktop shell. Stable strings so a
 * future migration can find and clear old entries without ambiguity.
 */
const KEYCHAIN_SERVICE = "com.avandarlabs.desktop";
const REFRESH_TOKEN_ACCOUNT = "supabase-refresh-token";
// Cached access-token-and-user payload, stored as JSON. Read at boot so
// the desktop shell can return a session offline even when the refresh
// exchange against Supabase fails (no network, etc.). This is what
// makes "quit, go offline, relaunch → still signed in" work for V1
// before the full sync engine lands in Phase 3.
const CACHED_SESSION_ACCOUNT = "supabase-cached-session";

type CachedSessionPayload = {
  accessToken: string;
  accessTokenExpiresAt: number;
  userId: string;
  email: string;
};

/**
 * Mutable Bun-main auth state shared between the auth IPC handler and
 * the server-api IPC handler. The Supabase access token never leaves
 * this process via persistence: only the refresh token is written to
 * the keychain, and only the (short-lived) access token crosses IPC.
 *
 * Construct one of these at boot via {@link createAuthState} and pass
 * the same instance into both `registerAuthHandlers` and
 * `registerServerApiHandlers`.
 */
export type AuthState = {
  accessToken: { token: string; expiresAt: number } | null;
  user: { id: string; email: string } | null;
};

/**
 * Creates a fresh {@link AuthState} object for the desktop boot. The
 * object is mutated in place by the auth IPC handlers; consumers (e.g.
 * the server-api handler) read whichever fields they need at request
 * time.
 */
export function createAuthState(): AuthState {
  return { accessToken: null, user: null };
}

type SupabaseTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email: string };
};

/**
 * Wires the `auth.*` IPC handlers (`signIn`, `signOut`, `getSession`,
 * `refreshIfNeeded`) into `server`. The handlers hold the access token
 * in memory only; the refresh token is persisted through the supplied
 * keychain. The desktop webview never sees the refresh token.
 *
 * Sign-in and refresh both hit the Supabase Auth REST endpoint directly
 * (no `@supabase/supabase-js` dependency on the Bun-main side); the
 * Supabase URL and anon key are read from `VITE_SUPABASE_API_URL` /
 * `VITE_SUPABASE_ANON_KEY` so the desktop binary picks up the same
 * config the web shell uses.
 *
 * `onAuthenticated` (optional) fires after the access token is in
 * place — i.e. after both `signIn` and the post-refresh branch of
 * `getSession`. Use it to drive the snapshot bootstrap so local SQLite
 * gets populated the first time a user signs in, without the caller
 * having to pre-seed `AVA_DEV_ACCESS_TOKEN`.
 *
 * @param server - The IPC server from `createIpcServer`.
 * @param keychain - Keychain service from `createKeychain`.
 * @param authState - Shared auth state object from `createAuthState`.
 * @param hooks - Optional lifecycle callbacks.
 */
export function registerAuthHandlers(
  server: IpcServer,
  keychain: Keychain,
  authState: AuthState,
  hooks: {
    onAuthenticated?: (accessToken: string) => Promise<void> | void;
  } = {},
): void {
  const supabaseUrl = process.env.VITE_SUPABASE_API_URL ?? "";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

  async function exchangeForSession(
    grantType: "password" | "refresh_token",
    body: Record<string, unknown>,
  ): Promise<SupabaseTokenResponse | null> {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase URL or anon key missing; set VITE_SUPABASE_API_URL and VITE_SUPABASE_ANON_KEY in the desktop env.",
      );
    }
    const res = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=${grantType}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as SupabaseTokenResponse;
  }

  async function applyTokenResponse(data: SupabaseTokenResponse): Promise<{
    accessToken: string;
    expiresAt: number;
  }> {
    const expiresAt = Date.now() + data.expires_in * 1000;
    authState.accessToken = { token: data.access_token, expiresAt };
    authState.user = { id: data.user.id, email: data.user.email };
    // Persist the access token (+ user) into the keychain so the next
    // boot can rehydrate a session offline. Refresh-on-boot will still
    // attempt the network exchange first; this is the offline fallback.
    const cached: CachedSessionPayload = {
      accessToken: data.access_token,
      accessTokenExpiresAt: expiresAt,
      userId: data.user.id,
      email: data.user.email,
    };
    await keychain.set(
      KEYCHAIN_SERVICE,
      CACHED_SESSION_ACCOUNT,
      JSON.stringify(cached),
    );
    return { accessToken: data.access_token, expiresAt };
  }

  async function readCachedSession(): Promise<CachedSessionPayload | null> {
    const raw = await keychain.get(KEYCHAIN_SERVICE, CACHED_SESSION_ACCOUNT);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as CachedSessionPayload;
    } catch {
      return null;
    }
  }

  server.handle(AuthContracts.signIn, async (req) => {
    const data = await exchangeForSession("password", {
      email: req.email,
      password: req.password,
    });
    if (data === null) {
      throw new Error("Sign-in failed");
    }
    await keychain.set(
      KEYCHAIN_SERVICE,
      REFRESH_TOKEN_ACCOUNT,
      data.refresh_token,
    );
    const { accessToken, expiresAt } = await applyTokenResponse(data);
    if (hooks.onAuthenticated) {
      // Best-effort: a bootstrap failure shouldn't fail the sign-in
      // call, and the caller already logs its own diagnostics.
      try {
        await hooks.onAuthenticated(accessToken);
      } catch (err) {
        console.error("[auth] onAuthenticated hook failed:", err);
      }
    }
    return {
      userId: data.user.id,
      email: data.user.email,
      accessToken,
      accessTokenExpiresAt: expiresAt,
    };
  });

  server.handle(AuthContracts.signOut, async () => {
    await keychain.delete(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT);
    await keychain.delete(KEYCHAIN_SERVICE, CACHED_SESSION_ACCOUNT);
    authState.accessToken = null;
    authState.user = null;
    return { ok: true as const };
  });

  server.handle(AuthContracts.getSession, async () => {
    if (authState.accessToken && authState.user) {
      return {
        session: {
          userId: authState.user.id,
          email: authState.user.email,
          accessToken: authState.accessToken.token,
          accessTokenExpiresAt: authState.accessToken.expiresAt,
          mode: "online" as const,
        },
      };
    }
    const refreshToken = await keychain.get(
      KEYCHAIN_SERVICE,
      REFRESH_TOKEN_ACCOUNT,
    );
    if (refreshToken === null) {
      return { session: null };
    }
    const data = await exchangeForSession("refresh_token", {
      refresh_token: refreshToken,
    }).catch(() => {
      return null;
    });
    if (data === null) {
      // Refresh failed (network down, Supabase unreachable, etc.). Fall
      // back to the cached access token written by the most recent
      // successful sign-in / refresh. The token may be expired against
      // the Supabase API, but local-only call paths (SQLite reads via
      // IPC, DuckDB-wasm queries against Dexie-cached parquets) don't
      // care — they let the user keep working offline against the
      // snapshot they had when they were last online.
      const cached = await readCachedSession();
      if (cached === null) {
        return { session: null };
      }
      authState.accessToken = {
        token: cached.accessToken,
        expiresAt: cached.accessTokenExpiresAt,
      };
      authState.user = { id: cached.userId, email: cached.email };
      return {
        session: {
          userId: cached.userId,
          email: cached.email,
          accessToken: cached.accessToken,
          accessTokenExpiresAt: cached.accessTokenExpiresAt,
          mode: "offline-cached" as const,
        },
      };
    }
    await keychain.set(
      KEYCHAIN_SERVICE,
      REFRESH_TOKEN_ACCOUNT,
      data.refresh_token,
    );
    const { accessToken, expiresAt } = await applyTokenResponse(data);
    return {
      session: {
        userId: data.user.id,
        email: data.user.email,
        accessToken,
        accessTokenExpiresAt: expiresAt,
        mode: "online" as const,
      },
    };
  });

  server.handle(AuthContracts.refreshIfNeeded, async () => {
    const oneMinute = 60_000;
    if (
      authState.accessToken !== null &&
      authState.accessToken.expiresAt > Date.now() + oneMinute
    ) {
      return { refreshed: false };
    }
    const refreshToken = await keychain.get(
      KEYCHAIN_SERVICE,
      REFRESH_TOKEN_ACCOUNT,
    );
    if (refreshToken === null) {
      return { refreshed: false };
    }
    const data = await exchangeForSession("refresh_token", {
      refresh_token: refreshToken,
    }).catch(() => {
      return null;
    });
    if (data === null) {
      return { refreshed: false };
    }
    await keychain.set(
      KEYCHAIN_SERVICE,
      REFRESH_TOKEN_ACCOUNT,
      data.refresh_token,
    );
    await applyTokenResponse(data);
    return { refreshed: true };
  });
}

