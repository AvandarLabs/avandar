import { createHash } from "node:crypto";

/** The `opendata` bucket folder every ODC Parquet copy is written under. */
export const PARQUET_CACHE_FOLDER = "catalog-cache";

/**
 * Builds where a listing's Parquet copy is stored in the `opendata` bucket.
 * The object is named after the source version it was built from, so a new
 * copy never overwrites one a reader may still be downloading.
 *
 * @param options.catalogListingId The listing.
 * @param options.sourceVersion The source's freshness token.
 */
export function buildParquetCacheObjectPath(
  options: Readonly<{ catalogListingId: string; sourceVersion: string }>,
): string {
  const versionHash = createHash("sha256")
    .update(options.sourceVersion)
    .digest("hex")
    .slice(0, 16);
  return `${PARQUET_CACHE_FOLDER}/${options.catalogListingId}/${versionHash}.parquet`;
}
