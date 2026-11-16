import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { FORBIDDEN } from "@sbfn/_shared/httpCodes.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/**
 * Confirms the caller may see `datasetId`, asked with the caller's own client
 * so `util__auth_user_may_select_dataset` applies the same rule as the
 * `datasets` row's SELECT policy. Call it before any read made with the
 * service role on a dataset's behalf, such as reading its rows through the
 * credential it was imported with.
 *
 * Throws `AvaHTTPError` (403) with one message whether the dataset is missing
 * or hidden from the caller, so nobody learns anything about a dataset they
 * cannot see.
 */
export async function assertMaySelectDataset(
  options: Readonly<{ supabaseClient: AvaSupabaseClient; datasetId: string }>,
): Promise<void> {
  const { data: maySelect, error } = await options.supabaseClient.rpc(
    "util__auth_user_may_select_dataset",
    { p_dataset_id: options.datasetId },
  );
  if (error) {
    console.error("Dataset access check failed", error);
  }
  if (error || maySelect !== true) {
    throw new AvaHTTPError(
      `No dataset '${options.datasetId}' found`,
      FORBIDDEN,
    );
  }
}
