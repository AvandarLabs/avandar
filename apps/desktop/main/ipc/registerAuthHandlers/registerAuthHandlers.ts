import { AuthContracts } from "$/platform/ipc/contracts/AuthContracts";
import type { Keychain } from "../../services/createKeychain/createKeychain";
import type { IpcServer } from "../createIpcServer/createIpcServer";

/*
 * Keychain identifiers for the Avandar desktop shell. Stable strings so a
 * future migration can find and clear old entries without ambiguity.
 */
const KEYCHAIN_SERVICE = "com.avandarlabs.desktop";
const REFRESH_TOKEN_ACCOUNT = "supabase-refresh-token";

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
 * @param server - The IPC server from `createIpcServer`.
 * @param keychain - Keychain service from `createKeychain`.
 */
export function registerAuthHandlers(
  server: IpcServer,
  keychain: Keychain,
  authState: AuthState,
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

  function applyTokenResponse(data: SupabaseTokenResponse): {
    accessToken: string;
    expiresAt: number;
  } {
    const expiresAt = Date.now() + data.expires_in * 1000;
    authState.accessToken = { token: data.access_token, expiresAt };
    authState.user = { id: data.user.id, email: data.user.email };
    return { accessToken: data.access_token, expiresAt };
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
    const { accessToken, expiresAt } = applyTokenResponse(data);
    return {
      userId: data.user.id,
      email: data.user.email,
      accessToken,
      accessTokenExpiresAt: expiresAt,
    };
  });

  server.handle(AuthContracts.signOut, async () => {
    await keychain.delete(KEYCHAIN_SERVICE, REFRESH_TOKEN_ACCOUNT);
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
      // Refresh failed (offline or revoked). The offline-cached path
      // arrives with the sync engine; for now, surface no session and
      // let the UI prompt re-login.
      return { session: null };
    }
    await keychain.set(
      KEYCHAIN_SERVICE,
      REFRESH_TOKEN_ACCOUNT,
      data.refresh_token,
    );
    const { accessToken, expiresAt } = applyTokenResponse(data);
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
    applyTokenResponse(data);
    return { refreshed: true };
  });
}

