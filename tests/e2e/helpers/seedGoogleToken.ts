import { getUserIdByEmail } from "../setup/e2eTestWorkspaceLifecycle";
import { createSupabaseAdminClient } from "./supabaseAdminClient";

/** The scope list `google-auth/auth-url` requests, so a seeded row matches. */
const DRIVE_FILE_SCOPE =
  "openid email https://www.googleapis.com/auth/drive.file";

/**
 * Connects a Google account to an e2e user by writing the row the OAuth
 * callback would have written.
 *
 * A direct write rather than a driven UI, because the alternative is Google's
 * hosted consent screen: it is another origin, it can demand a second factor,
 * and it is the one step of this flow no spec can own. Everything the write
 * feeds (the `google-auth/tokens` route, its refresh, and the Drive call the
 * frontend makes with the result) still runs for real. This is the
 * "pre-UI setup" exception in `docs/rules/testing.md`.
 *
 * `expiryDate` is the lever that picks which path runs. A future date is
 * returned as-is, which is what a hermetic spec wants; a past date makes the
 * route refresh against Google first, which is what a spec with a real refresh
 * token wants.
 *
 * @param options The user to connect, the tokens to store, and the expiry that
 * decides whether the route refreshes.
 */
export async function seedGoogleToken(
  options: Readonly<{
    email: string;
    accessToken: string;
    refreshToken: string;
    expiryDate: Date;
    googleEmail?: string;
    googleAccountId?: string;
  }>,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const userId = await getUserIdByEmail({
    supabaseAdminClient: admin,
    email: options.email,
  });
  if (!userId) {
    throw new Error(`No auth user found for ${options.email}.`);
  }

  await admin
    .from("tokens__google")
    .delete()
    .eq("user_id", userId)
    .throwOnError();

  await admin
    .from("tokens__google")
    .insert({
      user_id: userId,
      access_token: options.accessToken,
      refresh_token: options.refreshToken,
      expiry_date: options.expiryDate.toISOString(),
      google_email: options.googleEmail ?? options.email,
      google_account_id: options.googleAccountId ?? "100000000000000000001",
      scope: DRIVE_FILE_SCOPE,
    })
    .throwOnError();
}

/** Disconnects the Google account, so one spec cannot leak into another. */
export async function removeGoogleTokens(email: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const userId = await getUserIdByEmail({
    supabaseAdminClient: admin,
    email,
  });
  if (!userId) {
    return;
  }
  await admin
    .from("tokens__google")
    .delete()
    .eq("user_id", userId)
    .throwOnError();
}
