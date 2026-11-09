import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/**
 * The companions worth offering once their listing is added: those a
 * workspace can add, that load, and that the workspace does not have yet.
 */
export function getCompanionsToRecommend(
  companions: readonly DataCatalogListing.ResolvedCompanion[],
): DataCatalogListing.ResolvedCompanion[] {
  return companions.filter((companion) => {
    return (
      companion.isWorkspaceLoadable &&
      !companion.isInvalid &&
      !companion.isInWorkspace
    );
  });
}
