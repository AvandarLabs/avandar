import { z } from "zod";
import { defineRoutes, POST } from "../_shared/MiniServer/MiniServer.ts";
import type { WaitlistAPI } from "./waitlist.types.ts";

/**
 * This is the route handler for all waitlist endpoints.
 */
export const Routes = defineRoutes<WaitlistAPI>("waitlist", {
  /**
   * Verify that the `signupCode` is valid and assigned to the given `email`
   * on the waitlist.
   */
  "/:signupCode/verify": {
    POST: POST({
      path: "/:signupCode/verify",
      schema: {
        signupCode: z.string(),
      },
    })
      .disableJWTVerification()
      .bodySchema({
        email: z.email(),
      })
      .action(
        async ({
          body: { email },
          pathParams: { signupCode },
          supabaseAdminClient,
        }) => {
          // first, verify that the user doesnt already exist in the database
          const { data: userId } = await supabaseAdminClient.rpc(
            "util__get_user_id_by_email",
            { p_email: email },
          );
          if (userId) {
            throw new Error(
              "This email already has an account associated with it. Please try logging in instead.",
            );
          }

          // get the waitlist signup from the database
          const { data: waitlistSignup } = await supabaseAdminClient
            .from("waitlist_signups")
            .select("*")
            .eq("email", email)
            .eq("signup_code", signupCode)
            .single();
          if (!waitlistSignup) {
            throw new Error(
              "This email and signup code combination does not exist in the waitlist",
            );
          }
          if (waitlistSignup.code_is_used) {
            throw new Error("The signup code has already been claimed.");
          }
          return { success: true };
        },
      ),
  },

  /**
   * Claim a waitlist signup for a given user.
   */
  "/:signupCode/claim": {
    POST: POST({
      path: "/:signupCode/claim",
      schema: {
        signupCode: z.string(),
      },
    })
      .bodySchema({
        userId: z.string(),
        email: z.email(),
      })
      .disableJWTVerification()
      .action(
        async ({
          body: { userId, email },
          pathParams: { signupCode },
          supabaseAdminClient,
        }) => {
          // now verify that the user actually exists in the database
          const { data: user } =
            await supabaseAdminClient.auth.admin.getUserById(userId);
          if (user) {
            // update the waitlist signup to mark it as claimed
            await supabaseAdminClient
              .from("waitlist_signups")
              .update({ code_is_used: true })
              .eq("email", email)
              .eq("signup_code", signupCode)
              .eq("code_is_used", false);
            return { success: true };
          }
          throw new Error("Registered user not found");
        },
      ),
  },
});
