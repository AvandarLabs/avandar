import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { FORBIDDEN, NOT_FOUND } from "@sbfn/_shared/httpCodes.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/** Where a Sheets dataset's rows live, and whose Google grant reads them. */
export type AuthorizedSheetSource = {
  googleAccountId: string;
  googleDocumentId: string;

  /** The stored tab, or `null` for the workbook's first tab. */
  sheetName: string | null;
};

/**
 * Whether the caller may see this dataset, asked as the caller. Uses the
 * same check the `datasets` row's own select policy uses, so a person reads
 * a sheet's rows exactly when they can see the dataset itself.
 */
async function _maySelectDataset(
  options: Readonly<{ supabaseClient: AvaSupabaseClient; datasetId: string }>,
): Promise<boolean> {
  const { data, error } = await options.supabaseClient.rpc(
    "util__auth_user_may_select_dataset",
    { p_dataset_id: options.datasetId },
  );
  if (error) {
    console.error("Dataset access check failed", error);
    return false;
  }
  return data === true;
}

/**
 * The Sheets source of a dataset the caller may see. The access check runs
 * with the caller's own client first, and only then is the source row read
 * with the service role, so no one learns anything about a dataset they
 * cannot see: a denied caller gets the same 403 whether or not it exists.
 *
 * @returns The stored sheet, tab and owning Google account.
 * @throws AvaHTTPError 403 when the caller may not see the dataset, and 404
 *   when a dataset they can see is not backed by a Google Sheet.
 */
export async function getAuthorizedSheetSource(
  options: Readonly<{
    datasetId: string;
    supabaseClient: AvaSupabaseClient;
    supabaseAdminClient: AvaSupabaseClient;
  }>,
): Promise<AuthorizedSheetSource> {
  const { datasetId, supabaseAdminClient } = options;
  if (!(await _maySelectDataset(options))) {
    throw new AvaHTTPError(`No dataset '${datasetId}' found`, FORBIDDEN);
  }
  const { data: source, error } = await supabaseAdminClient
    .from("datasets__google_sheets")
    .select("google_account_id, google_document_id, sheet_name")
    .eq("dataset_id", datasetId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!source) {
    throw new AvaHTTPError(
      `Dataset '${datasetId}' is not backed by a Google Sheet`,
      NOT_FOUND,
    );
  }
  return {
    googleAccountId: source.google_account_id,
    googleDocumentId: source.google_document_id,
    sheetName: source.sheet_name,
  };
}
