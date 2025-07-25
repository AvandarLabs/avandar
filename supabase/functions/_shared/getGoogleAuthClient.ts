import { OAuth2Client } from "npm:google-auth-library@10";
import type { DBGoogleToken } from "./types/models.types.ts";

const NOT_FOUND = "NOT_FOUND";

const GoogleConfig = {
  clientId: Deno.env.get("GOOGLE_CLIENT_ID") ?? NOT_FOUND,
  clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? NOT_FOUND,
  redirectUri: Deno.env.get("GOOGLE_REDIRECT_URI") ?? NOT_FOUND,
};

export const GoogleAuthClient = new OAuth2Client(
  GoogleConfig.clientId,
  GoogleConfig.clientSecret,
  GoogleConfig.redirectUri,
);

/**
 * Sets the credentials for the GoogleAuthClient object.
 * To get the DBGoogleToken, you can use `getGoogleTokens()`,
 * which will retrieve a user's tokens from Supabase.
 *
 * @param dbToken A DBGoogleToken object. Retrievable from Supabase.
 * @returns An OAuth2Client object that can be used to make authenticated
 * requests to Google APIs.
 */
export function getGoogleAuthClient(dbToken: DBGoogleToken): OAuth2Client {
  GoogleAuthClient.setCredentials({
    ...dbToken,
    // convert the expiry_date to a numeric time in miliseconds
    // which is what google auth library expects
    expiry_date: new Date(dbToken.expiry_date).getTime(),
  });
  return GoogleAuthClient;
}
