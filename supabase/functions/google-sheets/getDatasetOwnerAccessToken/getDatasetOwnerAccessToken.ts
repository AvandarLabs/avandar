import { GoogleDriveError } from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveError.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/** Google's OAuth endpoint, where a refresh token buys an access token. */
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/** A token this close to expiring is refreshed, so it cannot lapse mid-read. */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

type RefreshedGoogleToken = {
  accessToken: string;
  expiryDate: string;

  /** Google usually omits it, and then the stored one stays valid. */
  refreshToken: string | undefined;
};

function _makeOwnerReconnectRequiredError(
  options: Readonly<{ status: number; reason: string }>,
): GoogleDriveError {
  return new GoogleDriveError({
    code: "owner-reconnect-required",
    status: options.status,
    reason: options.reason,
  });
}

/** The OAuth client's credentials, read when needed rather than at import. */
function _readOAuthClientCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured");
  }
  return { clientId, clientSecret };
}

/**
 * Exchanges a refresh token for a new access token. A plain request per
 * call, never the shared `GoogleAuthClient`, whose credentials concurrent
 * requests would overwrite. Google refusing the refresh token means its
 * owner revoked or let the grant lapse, which only that owner can fix.
 */
async function _refreshAccessToken(
  refreshToken: string,
): Promise<RefreshedGoogleToken> {
  const { clientId, clientSecret } = _readOAuthClientCredentials();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = (await response.json().catch(() => {
    return {};
  })) as {
    access_token?: unknown;
    expires_in?: unknown;
    refresh_token?: unknown;
  };
  if (
    !response.ok ||
    typeof body.access_token !== "string" ||
    typeof body.expires_in !== "number"
  ) {
    throw _makeOwnerReconnectRequiredError({
      status: response.status,
      reason: "token-refresh-refused",
    });
  }
  return {
    accessToken: body.access_token,
    expiryDate: new Date(Date.now() + body.expires_in * 1000).toISOString(),
    refreshToken:
      typeof body.refresh_token === "string" ? body.refresh_token : undefined,
  };
}

/**
 * Stores a refreshed token so the next read can reuse it. Best effort: the
 * token in hand is valid either way, so a failed write is logged rather than
 * failing the read it was refreshed for.
 */
async function _saveRefreshedToken(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    googleAccountId: string;
    refreshed: RefreshedGoogleToken;
  }>,
): Promise<void> {
  const { refreshed } = options;
  const { error } = await options.supabaseAdminClient
    .from("tokens__google")
    .update({
      access_token: refreshed.accessToken,
      expiry_date: refreshed.expiryDate,
      ...(refreshed.refreshToken === undefined
        ? {}
        : { refresh_token: refreshed.refreshToken }),
    })
    .eq("google_account_id", options.googleAccountId);
  if (error) {
    console.error("Failed to store a refreshed Google token", error);
  }
}

/**
 * A live access token for the Google account that added a Sheets dataset,
 * refreshed and stored first when it is about to expire. Read with the
 * service role, because the account usually belongs to someone other than
 * the caller, whose own access to the dataset the caller already checked.
 * The token is used server-side only and never returned to a browser.
 *
 * @returns The access token.
 * @throws GoogleDriveError `owner-reconnect-required` when the account has no
 *   stored token or Google refuses to refresh it.
 */
export async function getDatasetOwnerAccessToken(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    googleAccountId: string;
  }>,
): Promise<string> {
  const { supabaseAdminClient, googleAccountId } = options;
  const { data: token, error } = await supabaseAdminClient
    .from("tokens__google")
    .select("access_token, refresh_token, expiry_date")
    .eq("google_account_id", googleAccountId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!token) {
    throw _makeOwnerReconnectRequiredError({
      status: 401,
      reason: "no-stored-token",
    });
  }
  const msUntilExpiry = new Date(token.expiry_date).getTime() - Date.now();
  if (msUntilExpiry > REFRESH_THRESHOLD_MS) {
    return token.access_token;
  }
  const refreshed = await _refreshAccessToken(token.refresh_token);
  await _saveRefreshedToken({
    supabaseAdminClient,
    googleAccountId,
    refreshed,
  });
  return refreshed.accessToken;
}
