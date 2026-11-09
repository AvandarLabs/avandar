import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { OpenDataCompleteSample } from "@/lib/openData/fetchOpenDataColumnTypeSample/fetchOpenDataColumnTypeSample";
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
 * A listing the pipelines already store as Parquet needs no copy. A
 * complete sample of the listing this page already read, for its preview or
 * its column types, is handed back so the copy is built from it rather than
 * from the source.
 *
 * @param options.listing - The listing being added.
 * @param options.requestCopy - Asks the open-data edge function for the copy.
 * @param options.readCompleteSample - Reads a complete sample this page
 *   already holds for a listing.
 * @returns What the user should be told about the listing's data.
 */
export async function requestParquetCopyForAdding(options: {
  listing: Pick<DataCatalogListing.T, "id" | "accessKind">;
  requestCopy: (
    catalogListingId: DataCatalogListing.Id,
    copyOptions?: { completeSample: OpenDataCompleteSample },
  ) => Promise<OpenDataParquetCopyAnswer>;
  readCompleteSample?: (
    catalogListingId: DataCatalogListing.Id,
  ) => OpenDataCompleteSample | undefined;
}): Promise<ParquetCopyForAddingStatus> {
  const { listing } = options;
  if (listing.accessKind !== "api_resource") {
    return undefined;
  }
  const completeSample = options.readCompleteSample?.(listing.id);
  const answer =
    completeSample === undefined
      ? await options.requestCopy(listing.id)
      : await options.requestCopy(listing.id, { completeSample });
  if (answer.status === "building") {
    return "preparing";
  }
  return answer.status === "failed" ? "failed" : undefined;
}
