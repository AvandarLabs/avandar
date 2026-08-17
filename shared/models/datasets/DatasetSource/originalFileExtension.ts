import type { NonReconstructableDatasetSourceType } from "$/models/datasets/DatasetSource/DatasetSource.types.ts";

/**
 * The file extension retained for each non-reconstructable source type's
 * original file (see `requiresOriginalFileRetention`).
 *
 * Declared as a `Record` over `NonReconstructableDatasetSourceType` rather
 * than a single hardcoded extension so that adding a new retained-original
 * source type without deciding its extension is a compile error, not a
 * silently skipped upload/download/delete.
 *
 * Lives alongside `requiresOriginalFileRetention` (rather than inside
 * `DatasetOriginalFileStorageClient`) because both are the same kind of
 * fact: domain knowledge about which source types retain an original and
 * what that original looks like. Any caller of
 * `DatasetOriginalFileStorageClient` (upload, download, delete) needs the
 * extension, so it belongs here rather than duplicated per call site.
 */
const ORIGINAL_FILE_EXTENSION_BY_SOURCE_TYPE: Record<
  NonReconstructableDatasetSourceType,
  string
> = {
  pdf_file: "pdf",
};

/**
 * Returns the file extension of the retained original for a
 * non-reconstructable source type.
 */
export function getOriginalFileExtension(
  sourceType: NonReconstructableDatasetSourceType,
): string {
  return ORIGINAL_FILE_EXTENSION_BY_SOURCE_TYPE[sourceType];
}
