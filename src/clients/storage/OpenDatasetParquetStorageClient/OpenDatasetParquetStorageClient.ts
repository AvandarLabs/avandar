import { where } from "@avandar/utils";
import { OpenDataCatalogListingClient } from "@/clients/catalog-listings/OpenDataCatalogListingClient";
import type { OpenDataCatalogListingId } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListing.types";

/**
 * Downloads an open dataset Parquet blob from the catalog canonical URL.
 *
 * @param options The download options.
 * @param options.catalogListingId The catalog listing whose Parquet to fetch.
 * @returns The Parquet blob bytes.
 */
async function download(options: {
  catalogListingId: OpenDataCatalogListingId;
}): Promise<Blob> {
  const { catalogListingId } = options;

  const catalogListing = await OpenDataCatalogListingClient.getOne(
    where("id", "eq", catalogListingId),
  );

  if (!catalogListing) {
    throw new Error(
      `Missing catalog listing for open data (catalogListingId: ${catalogListingId}).`,
    );
  }

  const parquetUrl = catalogListing.canonicalUrls?.find((url) => {
    return url.toLowerCase().endsWith(".parquet");
  });

  if (!parquetUrl) {
    throw new Error("No Parquet URL in catalog for this open data listing.");
  }

  const response = await fetch(parquetUrl);

  if (!response.ok) {
    throw new Error(
      `Open data Parquet download failed: ${response.statusText}`,
    );
  }

  return await response.blob();
}

export const OpenDatasetParquetStorageClient = {
  download,
};
