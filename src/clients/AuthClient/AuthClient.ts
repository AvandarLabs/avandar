import {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
  WeakPassword,
} from "@supabase/supabase-js";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { isDesktop } from "$/platform/isDesktop";
import { ServerApiSessionRefresher } from "$/ServerApiClient";
import { PlatformRegistry } from "@/config/platform/PlatformRegistry/PlatformRegistry";
import { notifyExpiredSession } from "@/utils/notifications/notifyExpiredSession";
import type { Session as PlatformSession } from "$/platform/types/AuthProvider.types";

/**
 * In the Electrobun desktop shell, the sign-in, sign-out, and session-restore
 * paths use the platform layer's keychain-backed `AuthProvider`. Methods
 * without a desktop branch continue to use Supabase JS.
 *
 * The wider `AuthClient` surface (password reset, email update, user
 * registration) is not on the offline-demo path and stays on
 * Supabase JS even on desktop. Those flows require network anyway.
 */

type AuthClient = {
  /**
   * Sends a password reset email to the user.
   * @param email - The user's email address
   * @throws {AuthError} If the password reset fails
   */
  requestPasswordResetEmail: (email: string) => Promise<void>;

  /**
   * Updates the current user's password.
   * @param password - The new password
   * @returns A promise with the updated user
   * @throws {AuthError} If the update fails
   */
  updatePassword: (password: string) => Promise<{ user: User }>;

  /**
   * Updates the current user's email.
   * @param email - The new email address
   * @returns A promise with the updated user
   * @throws {AuthError} If the update fails
   */
  updateEmail: (email: string) => Promise<{ user: User }>;

  /**
   * Gets the currently authenticated user.
   * @returns A promise that resolves to the current user or undefined
   * (if the user is not authenticated)
   * @throws {AuthError} If we failed to retrieve the user
   */
  getCurrentSession: () => Promise<Session | undefined>;

  /**
   * Signs in a user.
   * @param signInParams - Signin params.
   *   - email - User email
   *   - password - User password
   * @throws {AuthError} If the sign in fails
   */
  signIn: (signInParams: {
    email: string;
    password: string;
  }) => Promise<{ user: User; session: Session; weakPassword?: WeakPassword }>;

  /**
   * Registers a new user.
   * @param registerParams - Registration params.
   *   - email - User email
   *   - password - User password
   * @returns A promise with the registered user
   * @throws {AuthError} If the registration fails
   */
  register: (registerParams: {
    email: string;
    password: string;
  }) => Promise<{ user: User }>;

  /**
   * Signs out the current user.
   * @throws {AuthError} If the sign out fails
   */
  signOut: () => Promise<void>;

  /**
   * Subscribes to auth state changes.
   * @param callback - A callback function that will be called when the auth
   * state changes.
   * @param callback.event - The event (a string literal enum) that triggered
   * the callback.
   * @param callback.session - The session that triggered the callback.
   * @returns A subscription object that can be used to unsubscribe from the
   * event.
   */
  onAuthStateChange: (
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ) => Subscription;

  /**
   * Returns whether the user manually triggered a signout.
   * @returns True if the user manually triggered a signout, false otherwise.
   */
  isManuallySignedOut: () => boolean;

  /**
   * Resets the manual sign out flag.
   */
  resetManualSignOut: () => void;

  /**
   * Wires the app's reaction to an unrecoverable session expiry (a `401`
   * that a token refresh could not fix). Call once at startup.
   */
  registerSessionExpiredHandler: () => void;
};

/**
 * Synthesises a Supabase-shaped `User` from the leaner platform
 * `Session`. Real Supabase users carry `app_metadata`, `aud`, etc.;
 * the codebase only reads `id` and `email` off the User today, so a
 * minimal shim is enough for the offline-restore path. Add fields
 * here if a consumer surfaces a missing property.
 */
function _platformSessionToSupabaseUser(session: PlatformSession): User {
  return {
    id: session.userId,
    email: session.email,
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "",
  } as User;
}

/**
 * Synthesises a Supabase-shaped `Session` from the leaner platform
 * `Session`. The refresh token stays in the OS keychain on the bun-main
 * side; only the short-lived access token crosses the boundary, so the
 * Supabase-shaped `refresh_token` is left as the empty string. Consumers
 * that compare token strings explicitly will need to migrate.
 */
function _platformSessionToSupabaseSession(session: PlatformSession): Session {
  const user = _platformSessionToSupabaseUser(session);
  return {
    access_token: session.accessToken,
    refresh_token: "",
    expires_in: Math.max(
      0,
      Math.floor((session.accessTokenExpiresAt - Date.now()) / 1000),
    ),
    expires_at: Math.floor(session.accessTokenExpiresAt / 1000),
    token_type: "bearer",
    user,
  };
}

function createAuthClient(): AuthClient {
  const _self = {
    isManuallySignedOut: false,
  };

  const _desktopOnAuthChangeListeners = new Set<
    (event: AuthChangeEvent, session: Session | null) => void
  >();
  let _desktopOnAuthChangeUnsub: (() => void) | undefined;

  function _ensureDesktopAuthListenerWired(): void {
    if (!isDesktop()) {
      return;
    }
    if (_desktopOnAuthChangeUnsub !== undefined) {
      return;
    }
    _desktopOnAuthChangeUnsub =
      PlatformRegistry.getImpls().authProvider.onAuthChange(
        (platformSession) => {
          const supabaseSession =
            platformSession === undefined ? null : (
              _platformSessionToSupabaseSession(platformSession)
            );
          const event: AuthChangeEvent =
            platformSession === undefined ? "SIGNED_OUT" : "SIGNED_IN";
          _desktopOnAuthChangeListeners.forEach((cb) => {
            cb(event, supabaseSession);
          });
        },
      );
  }

  return {
    requestPasswordResetEmail: async (email: string): Promise<void> => {
      const { error } = await AvaSupabase.db().auth.resetPasswordForEmail(
        email,
        { redirectTo: `${import.meta.env.VITE_APP_URL}/update-password` },
      );
      if (error) {
        throw error;
      }
    },

    updatePassword: async (password: string): Promise<{ user: User }> => {
      const { data, error } = await AvaSupabase.db().auth.updateUser({
        password,
      });
      if (error) {
        throw error;
      }
      if (data.user) {
        return { user: data.user };
      }

      // This error should not occur. It implies we somehow updated
      // the password successfully but then did not return a user.
      throw new Error("User not found.");
    },

    updateEmail: async (email: string): Promise<{ user: User }> => {
      const { data, error } = await AvaSupabase.db().auth.updateUser({
        email,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        return { user: data.user };
      }

      // This error should not occur. It implies we somehow updated
      // the email successfully but then did not return a user.
      throw new Error("User not found.");
    },

    getCurrentSession: async (): Promise<Session | undefined> => {
      if (isDesktop()) {
        try {
          const platformSession =
            await PlatformRegistry.getImpls().authProvider.getSession();
          if (platformSession === undefined) {
            return undefined;
          }
          return _platformSessionToSupabaseSession(platformSession);
        } catch (err) {
          console.error("Failed to get the current session (desktop)", err);
          return undefined;
        }
      }
      const { data, error } = await AvaSupabase.db().auth.getSession();
      if (error) {
        console.error("Failed to get the current session", error);
        return undefined;
      }
      return data.session ?? undefined;
    },

    signIn: async (signInParams: {
      email: string;
      password: string;
    }): Promise<{
      user: User;
      session: Session;
      weakPassword?: WeakPassword;
    }> => {
      const { email, password } = signInParams;
      if (isDesktop()) {
        const platformSession =
          await PlatformRegistry.getImpls().authProvider.signIn({
            kind: "password",
            email,
            password,
          });
        return {
          user: _platformSessionToSupabaseUser(platformSession),
          session: _platformSessionToSupabaseSession(platformSession),
        };
      }
      const { data, error } = await AvaSupabase.db().auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      _self.isManuallySignedOut = false;
      return data;
    },

    register: async (registerParams: {
      email: string;
      password: string;
    }): Promise<{ user: User }> => {
      const { email, password } = registerParams;
      const { error, data } = await AvaSupabase.db().auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        return { user: data.user };
      }

      // This error should not occur. It implies we somehow registered
      // successfully but then did not return a user.
      throw new Error("User not found.");
    },

    signOut: async (): Promise<void> => {
      _self.isManuallySignedOut = true;
      if (isDesktop()) {
        try {
          await PlatformRegistry.getImpls().authProvider.signOut();
        } catch (err) {
          _self.isManuallySignedOut = false;
          throw err;
        }
        return;
      }
      const { error } = await AvaSupabase.db().auth.signOut();
      if (error) {
        _self.isManuallySignedOut = false;
        throw error;
      }
    },

    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void,
    ): Subscription => {
      if (isDesktop()) {
        _ensureDesktopAuthListenerWired();
        _desktopOnAuthChangeListeners.add(callback);
        return {
          id: `desktop-${Date.now()}`,
          callback: callback as unknown as Subscription["callback"],
          unsubscribe: () => {
            _desktopOnAuthChangeListeners.delete(callback);
          },
        };
      }
      const {
        data: { subscription },
      } = AvaSupabase.db().auth.onAuthStateChange(callback);
      return subscription;
    },

    isManuallySignedOut: (): boolean => {
      return _self.isManuallySignedOut;
    },

    resetManualSignOut: (): void => {
      _self.isManuallySignedOut = false;
    },

    registerSessionExpiredHandler: (): void => {
      // On expiry we show the "session expired" toast and clear the stale
      // local session. Clearing the session (rather than routing to `/signin`
      // directly) lets the existing `SIGNED_OUT` -> `useAuth` -> `_auth`
      // `beforeLoad` machinery do the redirect, which preserves the return-to
      // URL. We deliberately clear the session at the Supabase layer rather
      // than through this client's `signOut`, so it is not recorded as a
      // manual sign-out and the redirect keeps its `redirect` search param.
      ServerApiSessionRefresher.setOnExpired(() => {
        notifyExpiredSession();
        void AvaSupabase.db().auth.signOut({ scope: "local" });
      });
    },
  };
}

export const AuthClient = createAuthClient();
