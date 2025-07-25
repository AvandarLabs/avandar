import { AvaHTTPError } from "../_shared/AvaHTTPError.ts";
import { getGoogleAuthClient } from "../_shared/getGoogleAuthClient.ts";
import { BAD_GATEWAY } from "../_shared/httpCodes.ts";
import { AvaSupabaseClient } from "../_shared/supabase.ts";
import type { DBGoogleToken } from "../_shared/types/models.types.ts";

// tokens within this many ms of expiry will be refreshed
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export async function getGoogleTokens({
  supabaseClient,
  userId,
}: {
  supabaseClient: AvaSupabaseClient;
  userId: string;
}): Promise<DBGoogleToken[]> {
  const { data: tokens } = await supabaseClient
    .from("tokens__google")
    .select("*")
    .eq("user_id", userId)
    .throwOnError();

  // first, determine which tokens are near expiry
  const validTokens: DBGoogleToken[] = [];
  const tokensNeedingRefresh: DBGoogleToken[] = [];

  tokens.forEach((token) => {
    const expiryDate = new Date(token.expiry_date);
    const isExpired =
      expiryDate < new Date(Date.now() + TOKEN_REFRESH_THRESHOLD);
    if (isExpired) {
      tokensNeedingRefresh.push(token);
    } else {
      validTokens.push(token);
    }
  });

  // Refresh the necessary tokens in parallel
  const dbTokensToUpdate: DBGoogleToken[] = await Promise.all(
    tokensNeedingRefresh.map(async (dbToken) => {
      try {
        const googleAuthClient = getGoogleAuthClient(dbToken);

        const { credentials } = await googleAuthClient.refreshAccessToken();

        // verify credentials have the necessary properties
        if (!credentials.access_token) {
          throw new AvaHTTPError(
            "Did not receive an access token from Google",
            BAD_GATEWAY,
          );
        }

        if (!credentials.refresh_token) {
          throw new AvaHTTPError(
            "Did not receive a refresh token from Google",
            BAD_GATEWAY,
          );
        }

        if (!credentials.expiry_date) {
          throw new Error("Did not receive an expiry date from Google");
        }

        // update the necessary properties
        return {
          ...dbToken,
          id: dbToken.id, // just making sure this gets set
          expiry_date: new Date(credentials.expiry_date).toISOString(),
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token,
        };
      } catch (error) {
        console.error(error);
        console.log("Returning the original token instead.");
        return dbToken;
      }
    }),
  );

  // bulk update the necessary tokens
  const { data: refreshedTokens } = await supabaseClient
    .from("tokens__google")
    .upsert(dbTokensToUpdate)
    .select()
    .throwOnError();

  return [...validTokens, ...refreshedTokens];
}
