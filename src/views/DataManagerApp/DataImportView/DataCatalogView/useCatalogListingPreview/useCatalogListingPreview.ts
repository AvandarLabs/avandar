import { useQuery } from "@tanstack/react-query";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { fetchCatalogListingPreview } from "@/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { CatalogListingPreview } from "@/lib/openData/fetchCatalogListingPreview/fetchCatalogListingPreview";

/** What the open listing's data preview shows. */
export type CatalogListingPreviewState = {
  preview: CatalogListingPreview | undefined;
  isLoading: boolean;
  isError: boolean;
  /** False when the listing has no data a workspace could read. */
  isAvailable: boolean;
};

/**
 * Reads the first rows of the open catalog listing, the same number a
 * workspace dataset's preview shows. A listing that is invalid, or that a
 * workspace cannot load, has no preview to read.
 *
 * The rows are kept for the page's life: a listing's data changes on the
 * pipeline's schedule, not while someone is browsing.
 *
 * @param listing The open listing, or undefined when none is open.
 */
export function useCatalogListingPreview(
  listing: DataCatalogListing.T | undefined,
): CatalogListingPreviewState {
  const isAvailable =
    listing !== undefined && listing.isWorkspaceLoadable && !listing.isInvalid;
  // Only what the read depends on, so a listing refetched for another reason
  // (its column types being verified, say) does not read its data again.
  const previewSource =
    listing === undefined
      ? undefined
      : {
          id: listing.id,
          accessKind: listing.accessKind,
          apiResourceFormat: listing.apiResourceFormat,
          canonicalUrls: listing.canonicalUrls,
        };
  const query = useQuery({
    queryKey: ["data-catalog-listing-preview", previewSource],
    queryFn: () => {
      // Unreachable: the query only runs while `isAvailable`.
      if (previewSource === undefined) {
        throw new Error("No catalog listing is open to preview");
      }
      return fetchCatalogListingPreview({
        listing: previewSource,
        maxPreviewRows: GlobalAppConfig.dataManagerApp.maxPreviewRows,
      });
    },
    enabled: isAvailable,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return {
    preview: query.data,
    isLoading: isAvailable && query.isPending,
    isError: query.isError,
    isAvailable,
  };
}
