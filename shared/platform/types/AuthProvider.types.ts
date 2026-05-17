/**
 * Platform-agnostic auth provider.
 *
 * On web this wraps Supabase JS auth (sessions in localStorage). On desktop
 * (Phase 2+) refresh tokens live in the OS keychain via Bun FFI.
 */
export interface AuthProvider {
  getSession(): Promise<Session | null>;
  signIn(credentials: AuthCredentials): Promise<Session>;
  signOut(): Promise<void>;
  refreshIfNeeded(): Promise<void>;
  onAuthChange(callback: (session: Session | null) => void): Unsubscribe;
}

/**
 * Credentials accepted by {@link AuthProvider.signIn}.
 */
export type AuthCredentials =
  | { kind: "password"; email: string; password: string }
  | { kind: "magic-link"; email: string };

/**
 * Active auth session. `mode` distinguishes a live session from a
 * locally-cached one used while the desktop client is offline.
 */
export type Session = Readonly<{
  userId: string;
  email: string;
  accessToken: string;
  accessTokenExpiresAt: number; // ms epoch
  mode: "online" | "offline-cached";
}>;

/**
 * Cancels an event subscription registered via `onAuthChange` or similar.
 */
export type Unsubscribe = () => void;
