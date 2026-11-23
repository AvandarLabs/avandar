import { corsHeaders } from "@sbfn/_shared/cors.ts";
import { statusFromOpenDataFailure } from "@sbfn/open-data/statusFromOpenDataFailure/statusFromOpenDataFailure.ts";
import { failureToInvalidDatasetReason } from "$/connectors/open-data/failureToInvalidDatasetReason/failureToInvalidDatasetReason.ts";
import type { OpenDataAcquisitionFailed } from "$/connectors/open-data/openDataErrors.ts";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.ts";

/** Marks a listing's dataset as one that cannot be loaded. */
export type MarkListingInvalid = (args: {
  catalogListingId: string;
  reason: DataCatalogListing.InvalidDatasetReason;
}) => Promise<void>;

/**
 * Answers a failed sample read. When the failure says the dataset itself
 * cannot be loaded, the listing is marked invalid first and the body names
 * the reason, so the app can show it without refetching. A failure of the
 * catalog's own API leaves the listing as it was.
 *
 * @param args.catalogListingId - The listing whose sample failed.
 * @param args.error - Why it failed.
 * @param args.markInvalid - Records the listing as invalid.
 * @returns `{ error: { code, invalidDatasetReason? } }` with the failure's
 *   status.
 */
export async function respondWithSampleFailure(args: {
  catalogListingId: string;
  error: OpenDataAcquisitionFailed;
  markInvalid: MarkListingInvalid;
}): Promise<Response> {
  const { failure } = args.error;
  const reason = failureToInvalidDatasetReason(failure);
  if (reason !== undefined) {
    await args.markInvalid({ catalogListingId: args.catalogListingId, reason });
  }
  const body = {
    error: {
      code: failure.code,
      ...(reason === undefined ? {} : { invalidDatasetReason: reason }),
    },
  };
  return new Response(JSON.stringify(body), {
    status: statusFromOpenDataFailure(failure.code),
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
