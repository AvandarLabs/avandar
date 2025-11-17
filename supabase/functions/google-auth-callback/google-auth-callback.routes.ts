import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "zod";
import { AvaHTTPError } from "../_shared/AvaHTTPError.ts";
import { GoogleAuthClient } from "../_shared/getGoogleAuthClient.ts";
import { BAD_REQUEST } from "../_shared/httpCodes.ts";
import { defineRoutes, GET } from "../_shared/MiniServer/MiniServer.ts";
import { redirect } from "../_shared/MiniServer/redirect.ts";
import { SupabaseAdmin } from "../_shared/supabase.ts";
import type { GoogleAuthCallbackAPI } from "./google-auth-callback.types.ts";
import type { TokenPayload } from "google-auth-library";

const GoogleTokensSchema = z.object({
  expiry_date: z.number(),
  access_token: z.string(),
  refresh_token: z.string(),
  scope: z.string(),
});

const AuthStateSchema = z.object({
  redirectURL: z.url(),
  userId: z.uuid(),
});

export const Routes = defineRoutes<GoogleAuthCallbackAPI>(
  "google-auth-callback",
  {
    /**
     * This function is the callback for the Google OAuth2 flow.
     * At this point, the user has authenticated with Google and has been
     * redirected to this GET endpoint. At this point, we retrieve the `code`
     * that Google provides and exchange this for a token.
     *
     * NOTE: this route has to be a standalone function. It cannot be combined
     * with the `google-auth` function because this route must be public. It
     * needs to have JWT verification disabled. Toggling JWT verification for a
     * function is handled at a system level (in config.toml) so the functions
     * cannot be combined.
     */
    "/": {
      GET: GET("/")
        .disableJWTVerification()
        .querySchema({
          state: z.string(),
          code: z.string(),
        })
        .action(async ({ queryParams }) => {
          const googleCode = queryParams.code;
          const { redirectURL, userId } = AuthStateSchema.parse(
            JSON.parse(queryParams.state),
          );

          // Let's exchange the `code` for a token
          const tokenResponse = await GoogleAuthClient.getToken(googleCode);

          const idToken = tokenResponse.tokens.id_token;
          if (!idToken) {
            throw new AvaHTTPError(
              "No ID token found in token response",
              BAD_REQUEST,
            );
          }

          const payload = JSON.parse(
            atob(idToken.split(".")[1]),
          ) as TokenPayload;
          const googleAccountID = payload.sub;
          const googleEmail = payload.email;

          if (!googleEmail) {
            throw new AvaHTTPError(
              "No email found in token payload",
              BAD_REQUEST,
            );
          }

          const parsedTokens = GoogleTokensSchema.parse(tokenResponse.tokens);

          // Set the tokens into the auth client
          // GoogleAuthClient.setCredentials(tokenResponse.tokens);

          // Add the tokens to the database.
          // We use an `upsert` with `onConflict` in order to update the tokens
          // if we already had a user_id+google_account_id pair, instead of
          // returning a database error.
          await SupabaseAdmin.from("tokens__google")
            .upsert(
              {
                user_id: userId,
                expiry_date: new Date(parsedTokens.expiry_date).toISOString(),
                google_account_id: googleAccountID,
                google_email: googleEmail,
                access_token: parsedTokens.access_token,
                refresh_token: parsedTokens.refresh_token,
                scope: parsedTokens.scope,
              },
              {
                onConflict: "user_id,google_account_id",
                ignoreDuplicates: false,
              },
            )
            .throwOnError();

          throw redirect(redirectURL);
        }),
    },
  },
);
