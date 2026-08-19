import { GoogleAuthClient } from "@sbfn/_shared/getGoogleAuthClient.ts";

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
    // `auth/drive.file` is a per-file, Non-sensitive scope: it grants access to
    // exactly the files the user hands over through the Google Picker, and the
    // app cannot list or search a Drive. Sheets acquisition needs nothing
    // wider, because Drive's `files.export` reaches a picked spreadsheet on
    // this scope alone.
    //
    // `auth/spreadsheets` used to be requested here. It is Sensitive (read and
    // write on *every* spreadsheet in the account, forever) and nothing in this
    // codebase needs it.
    //
    // Removing it narrows **new** grants only. A refresh token issued under the
    // old list keeps the wider grant, and `tokens__google.scope` keeps
    // recording it, until the user revokes Avandar at
    // myaccount.google.com/permissions or re-consents. So do not assert this
    // list against stored scopes; assert it against what this function
    // requests. `prompt: "consent"` below is what makes a re-authentication
    // actually re-issue on the narrower list.
    scope: ["openid", "email", "https://www.googleapis.com/auth/drive.file"],
    state: JSON.stringify(authState),
  });

  return { authorizeURL };
}
