import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

/**
 * The listings of every loaded search page, in order. A pipeline writing
 * while the user scrolls can push a listing from one page onto the next, so
 * a listing a later page repeats is kept only where it first appeared.
 */
export function searchPagesToListings(
  pages: ReadonlyArray<{ rows: readonly DataCatalogListing.SearchResult[] }>,
): DataCatalogListing.SearchResult[] {
  const seenIds = new Set<DataCatalogListing.Id>();
  return pages.flatMap((page) => {
    return page.rows.filter((listing) => {
      if (seenIds.has(listing.id)) {
        return false;
      }
      seenIds.add(listing.id);
      return true;
    });
  });
}
