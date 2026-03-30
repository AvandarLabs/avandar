import { where } from "@utils/filters/where/where";
import { OpenDataCatalogEntryClient } from "@/clients/catalog-entries/OpenDataCatalogEntryClient";
import type { OpenDataCatalogEntryId } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types";

/**
 * Downloads an open dataset Parquet blob from the catalog canonical URL.
 *
 * @param options The download options.
 * @param options.catalogEntryId The open catalog entry whose Parquet to fetch.
 * @returns The Parquet blob bytes.
 */
async function download(options: {
  catalogEntryId: OpenDataCatalogEntryId;
}): Promise<Blob> {
  const { catalogEntryId } = options;

  const catalogEntry = await OpenDataCatalogEntryClient.getOne(
    where("id", "eq", catalogEntryId),
  );

  if (!catalogEntry) {
    throw new Error(
      `Missing catalog entry for open data (catalogEntryId: ${catalogEntryId}).`,
    );
  }

  const parquetUrl = catalogEntry.canonicalUrls?.find((url) => {
    return url.toLowerCase().endsWith(".parquet");
  });

  if (!parquetUrl) {
    throw new Error("No Parquet URL in catalog for this open data entry.");
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
