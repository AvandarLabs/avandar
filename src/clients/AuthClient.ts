import {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
  WeakPassword,
} from "@supabase/supabase-js";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";

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
};

function createAuthClient(): AuthClient {
  const _self = {
    isManuallySignedOut: false,
  };

  return {
    requestPasswordResetEmail: async (email: string): Promise<void> => {
      const { error } = await AvaSupabase.DB.auth.resetPasswordForEmail(email, {
        redirectTo: `${import.meta.env.VITE_APP_URL}/update-password`,
      });
      if (error) {
        throw error;
      }
    },

    updatePassword: async (password: string): Promise<{ user: User }> => {
      const { data, error } = await AvaSupabase.DB.auth.updateUser({
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
      const { data, error } = await AvaSupabase.DB.auth.updateUser({
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
      const { data, error } = await AvaSupabase.DB.auth.getSession();
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
      const { data, error } = await AvaSupabase.DB.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      return data;
    },

    register: async (registerParams: {
      email: string;
      password: string;
    }): Promise<{ user: User }> => {
      const { email, password } = registerParams;
      const { error, data } = await AvaSupabase.DB.auth.signUp({
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

      const { error } = await AvaSupabase.DB.auth.signOut();
      if (error) {
        _self.isManuallySignedOut = false;
        throw error;
      }
    },

    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void,
    ): Subscription => {
      const {
        data: { subscription },
      } = AvaSupabase.DB.auth.onAuthStateChange(callback);
      return subscription;
    },

    isManuallySignedOut: (): boolean => {
      return _self.isManuallySignedOut;
    },

    resetManualSignOut: (): void => {
      _self.isManuallySignedOut = false;
    },
  };
}

export const AuthClient = createAuthClient();
