import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "zod";
import {
  defineRoutes,
  GET,
  MiniServer,
} from "../_shared/MiniServer/MiniServer.ts";
import { getAuthURL } from "./getAuthURL.ts";
import { getGoogleTokens } from "./getGoogleTokens.ts";
import type { GoogleAuthAPI } from "./google-auth.types.ts";

export const Routes = defineRoutes<GoogleAuthAPI>("google-auth", {
  /**
   * This function is used to initiate the Google OAuth2 flow. It returns
   * an authorization URL that the frontend can use to redirect the user.
   */
  "/auth-url": {
    GET: GET("/auth-url")
      .querySchema({ redirectURL: z.url() })
      .action(({ user, queryParams }) => {
        return getAuthURL({
          redirectURL: queryParams.redirectURL,
          userId: user.id,
        });
      }),
  },

  /**
   * This function is used to get the access tokens for the current user.
   * Any tokens within TOKEN_REFRESH_THRESHOLD of expiry will be refreshed.
   * The refreshed tokens will be returned in the response.
   *
   * In short, when the frontend calls this function to receive new tokens,
   * they can always be confident that they have valid tokens to use for
   * any Google API calls.
   */
  "/tokens": {
    GET: GET("/tokens").action(async ({ supabaseClient, user }) => {
      const refreshedTokens = await getGoogleTokens({
        supabaseClient,
        userId: user.id,
      });
      return { tokens: refreshedTokens };
    }),
  },
});

MiniServer(Routes).serve();
