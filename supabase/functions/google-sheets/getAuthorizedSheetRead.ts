import { assertMaySelectDataset } from "@sbfn/_shared/assertMaySelectDataset/assertMaySelectDataset.ts";
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { NOT_FOUND } from "@sbfn/_shared/httpCodes.ts";
import { getDatasetOwnerAccessToken } from "@sbfn/google-sheets/getDatasetOwnerAccessToken.ts";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/** Where a Sheets dataset's rows live, and whose Google grant reads them. */
export type AuthorizedSheetSource = Pick<
  GoogleSheetsDataset.T,
  "googleAccountId" | "googleDocumentId" | "sheetName"
>;

/** A Sheets dataset a caller asks to read, and who is asking. */
export type AuthorizedSheetReadOptions = {
  datasetId: string;

  /** The caller's own session, which the access check runs as. */
  supabaseClient: AvaSupabaseClient;
  supabaseAdminClient: AvaSupabaseClient;

  /** The caller's user id, which tells the sheet's owner from everyone else. */
  callerUserId: string;
};

/** What a caller who may see a Sheets dataset reads it with. */
export type AuthorizedSheetRead = {
  source: AuthorizedSheetSource;
  accessToken: string;

  /** Whether the caller is the person whose Google grant reads the sheet. */
  isCallerTheOwner: boolean;
};

async function _getSheetSource(
  options: Readonly<AuthorizedSheetReadOptions>,
): Promise<AuthorizedSheetSource> {
  const { data: source, error } = await options.supabaseAdminClient
    .from("datasets__google_sheets")
    .select("google_account_id, google_document_id, sheet_name")
    .eq("dataset_id", options.datasetId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!source) {
    throw new AvaHTTPError(
      `Dataset '${options.datasetId}' is not backed by a Google Sheet`,
      NOT_FOUND,
    );
  }
  return {
    googleAccountId: source.google_account_id,
    googleDocumentId: source.google_document_id,
    sheetName: source.sheet_name,
  };
}

/**
 * The Sheets source of a dataset the caller may see, and a live access token
 * for the Google account that added it. A caller who may not see the
 * dataset gets the same 403 whether or not it exists, and no token is ever
 * read on their behalf.
 *
 * @returns The stored sheet and tab, the token that reads them, and whether
 *   the caller owns that token.
 * @throws AvaHTTPError 403 when the caller may not see the dataset, and 404
 *   when a dataset they can see is not backed by a Google Sheet.
 * @throws GoogleDriveError when the owner's Google grant cannot be used.
 */
export async function getAuthorizedSheetRead(
  options: Readonly<AuthorizedSheetReadOptions>,
): Promise<AuthorizedSheetRead> {
  // The access check runs as the caller before anything is read with the
  // service role.
  await assertMaySelectDataset(options);
  const source = await _getSheetSource(options);
  const { accessToken, isCallerTheOwner } = await getDatasetOwnerAccessToken({
    supabaseAdminClient: options.supabaseAdminClient,
    googleAccountId: source.googleAccountId,
    callerUserId: options.callerUserId,
  });
  return { source, accessToken, isCallerTheOwner };
}
