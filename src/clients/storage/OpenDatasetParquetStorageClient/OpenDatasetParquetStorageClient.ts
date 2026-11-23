import { where } from "@avandar/utils";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import type { DataCatalogListingId } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";

/**
 * Downloads an open dataset Parquet blob from the catalog canonical URL.
 *
 * @param options The download options.
 * @param options.catalogListingId The catalog listing whose Parquet to fetch.
 * @returns The Parquet blob bytes.
 */
async function download(options: {
  catalogListingId: DataCatalogListingId;
}): Promise<Blob> {
  const { catalogListingId } = options;

  const catalogListing = await DataCatalogListingClient.getOne(
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
