/**
 * Platform-agnostic auth provider.
 *
 * On web this wraps Supabase JS auth (sessions in localStorage). On
 * desktop, refresh tokens live in the OS keychain, accessed by shelling
 * out to the platform's native credential CLI (`/usr/bin/security` on
 * macOS, `cmdkey` on Windows).
 */
export interface AuthProvider {
  getSession(): Promise<Session | undefined>;
  signIn(credentials: AuthCredentials): Promise<Session>;
  signOut(): Promise<void>;
  refreshIfNeeded(): Promise<void>;
  onAuthChange(callback: (session: Session | undefined) => void): Unsubscribe;
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
