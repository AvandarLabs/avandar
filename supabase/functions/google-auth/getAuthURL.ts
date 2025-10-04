import { GoogleAuthClient } from "../_shared/getGoogleAuthClient.ts";

/**
 * This function generates the URL that will be used for the Google
 * consent dialog. Once the user authenticates, the consent dialog
 * will automatically call GET on the `/google-auth-callback` endpoint.
 *
 * This callback URL is configured in the Google Web Console, within
 * the OAuth Client settings, under "Authorized redirect URIs".
 * The callback URL also needs to be set in the Supabase Edge functions
 * env as `GOOGLE_REDIRECT_URI`.
 *
 * @param authState - The state to pass to the callback URL. This includes
 * the post-callback redirect URL (where we should redirect the user to
 * **after** the `/google-auth-callback` is completed), and the Supabase
 * User ID.
 * @returns The authorization URL for the Google consent dialog.
 */
export function getAuthURL(authState: {
  redirectURL: string;
  userId: string;
}): { authorizeURL: string } {
  const authorizeURL = GoogleAuthClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
    state: JSON.stringify(authState),
  });

  return { authorizeURL };
}
