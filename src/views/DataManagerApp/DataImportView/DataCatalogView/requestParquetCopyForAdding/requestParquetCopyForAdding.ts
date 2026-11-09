import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { OpenDataParquetCopyAnswer } from "@/lib/openData/requestOpenDataParquetCopy/requestOpenDataParquetCopy";

/**
 * What adding a listing should tell the user about its data: `preparing`
 * while its Parquet copy builds, `failed` when the copy could not be built,
 * and nothing otherwise.
 */
export type ParquetCopyForAddingStatus = "preparing" | "failed" | undefined;

/**
 * Requests an API-backed listing's Parquet copy as it is added to a
 * workspace, so the first build starts before the dataset is first opened.
 * A listing the pipelines already store as Parquet needs no copy.
 *
 * @param options.listing - The listing being added.
 * @param options.requestCopy - Asks the open-data edge function for the copy.
 * @returns What the user should be told about the listing's data.
 */
export async function requestParquetCopyForAdding(options: {
  listing: Pick<DataCatalogListing.T, "id" | "accessKind">;
  requestCopy: (
    catalogListingId: DataCatalogListing.Id,
  ) => Promise<OpenDataParquetCopyAnswer>;
}): Promise<ParquetCopyForAddingStatus> {
  if (options.listing.accessKind !== "api_resource") {
    return undefined;
  }
  const answer = await options.requestCopy(options.listing.id);
  if (answer.status === "building") {
    return "preparing";
  }
  return answer.status === "failed" ? "failed" : undefined;
}
