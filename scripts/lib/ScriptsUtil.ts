import { supabaseClient } from "@/lib/clients/supabaseClient";
import { User } from "@/models/User";

export const ScriptsUtil = {
  /**
   * Creates a new user in the Supabase database.
   *
   * @param user - The user to create.
   * @returns The created user.
   */
  async createUser(user: { email: string; password: string }): Promise<User> {
    const { data, error } = await supabaseClient.auth.signUp({
      email: user.email,
      password: user.password,
    });

    if (error) {
      console.error("Error creating user:", error.message);
      throw error;
    }

    if (!data.user) {
      throw new Error(
        "There was no supabase error, but the user still failed to create.",
      );
    }

    console.log("User created:", {
      id: data.user.id,
      email: data.user.email,
    });

    return data.user as User;
  },
};
