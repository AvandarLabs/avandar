import { defineIpcContract } from "$/platform/ipc/contracts/defineIpcContract.ts";

/**
 * Auth IPC contracts. The Bun-main handler holds the refresh token in the OS
 * keychain and never exposes it to the webview; only short-lived access
 * tokens cross the IPC boundary. The Bun-main handlers live in
 * `apps/desktop/main/ipc/auth.ts` and call into
 * `apps/desktop/main/services/Keychain.ts` (Phase 2 Task 11).
 */
export const AuthContracts = {
  signIn: defineIpcContract<
    { email: string; password: string },
    {
      userId: string;
      email: string;
      accessToken: string;
      accessTokenExpiresAt: number;
    }
  >("auth.signIn"),
  signOut: defineIpcContract<Record<string, never>, { ok: true }>(
    "auth.signOut",
  ),
  getSession: defineIpcContract<
    Record<string, never>,
    {
      // null (not undefined) so the JSON wire envelope preserves the
      // "no active session" signal.
      session:
        | {
            userId: string;
            email: string;
            accessToken: string;
            accessTokenExpiresAt: number;
            mode: "online" | "offline-cached";
          }
        | null;
    }
  >("auth.getSession"),
  refreshIfNeeded: defineIpcContract<
    Record<string, never>,
    { refreshed: boolean }
  >("auth.refreshIfNeeded"),
} as const;
