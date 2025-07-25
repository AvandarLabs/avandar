import {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
  WeakPassword,
} from "@supabase/supabase-js";
import { SupabaseDBClient } from "../lib/clients/supabase/SupabaseDBClient";

export const AuthClient = {
  /**
   * Sends a password reset email to the user.
   * @param email - The user's email address
   * @throws {AuthError} If the password reset fails
   */
  requestPasswordResetEmail: async (email: string): Promise<void> => {
    const { error } = await SupabaseDBClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL}/update-password`,
    });
    if (error) {
      throw error;
    }
  },

  /**
   * Updates the current user's password.
   * @param password - The new password
   * @returns A promise with the updated user
   * @throws {AuthError} If the update fails
   */
  updatePassword: async (password: string): Promise<{ user: User }> => {
    const { data, error } = await SupabaseDBClient.auth.updateUser({
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

  /**
   * Updates the current user's email.
   * @param email - The new email address
   * @returns A promise with the updated user
   * @throws {AuthError} If the update fails
   */
  updateEmail: async (email: string): Promise<{ user: User }> => {
    const { data, error } = await SupabaseDBClient.auth.updateUser({
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

  /**
   * Gets the currently authenticated user.
   * @returns A promise that resolves to the current user or undefined
   * (if the user is not authenticated)
   * @throws {AuthError} If we failed to retrieve the user
   */
  getCurrentSession: async (): Promise<Session | undefined> => {
    const { data, error } = await SupabaseDBClient.auth.getSession();
    if (error) {
      console.error("Failed to get the current session", error);
      return undefined;
    }
    return data.session ?? undefined;
  },

  /**
   * Signs in a user.
   * @param signInParams - Signin params.
   *   - email - User email
   *   - password - User password
   * @throws {AuthError} If the sign in fails
   */
  signIn: async (signInParams: {
    email: string;
    password: string;
  }): Promise<{
    user: User;
    session: Session;
    weakPassword?: WeakPassword;
  }> => {
    const { email, password } = signInParams;
    const { data, error } = await SupabaseDBClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
    return data;
  },

  /**
   * Registers a new user.
   * @param registerParams - Registration params.
   *   - email - User email
   *   - password - User password
   * @returns A promise with the registered user
   * @throws {AuthError} If the registration fails
   */
  register: async (registerParams: {
    email: string;
    password: string;
  }): Promise<{ user: User }> => {
    const { email, password } = registerParams;
    const { error, data } = await SupabaseDBClient.auth.signUp({
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

  /**
   * Signs out the current user.
   * @throws {AuthError} If the sign out fails
   */
  signOut: async (): Promise<void> => {
    const { error } = await SupabaseDBClient.auth.signOut();
    if (error) {
      throw error;
    }
  },

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
  ): Subscription => {
    const {
      data: { subscription },
    } = SupabaseDBClient.auth.onAuthStateChange(callback);
    return subscription;
  },
};
