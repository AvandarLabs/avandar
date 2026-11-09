/** The `opendata` bucket folder every ODC Parquet copy is written under. */
export const PARQUET_CACHE_FOLDER = "catalog-cache";

/**
 * Builds the `opendata` bucket folder a listing's Parquet copy is written
 * to, as `part-00000.parquet` onward. The folder is named after the build
 * that writes it, so a new copy never overwrites one a reader may still be
 * downloading, and a failed build can delete what it uploaded without
 * touching another build's copy.
 *
 * @param options.catalogListingId The listing.
 * @param options.buildId The build's id, from its build claim.
 */
export function buildParquetCacheFolderPath(
  options: Readonly<{ catalogListingId: string; buildId: string }>,
): string {
  return `${PARQUET_CACHE_FOLDER}/${options.catalogListingId}/${options.buildId}`;
}
