import { useQuery } from "@tanstack/react-query";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * The query key every listing's companions are cached under. Invalidate it
 * after a dataset is added, since that changes which companions are already
 * in the workspace.
 */
export const CATALOG_LISTING_COMPANIONS_QUERY_KEY = [
  DataCatalogListingClient.getClientName(),
  "getCompanions",
] as const;

const NO_COMPANIONS: readonly DataCatalogListing.ResolvedCompanion[] = [];

/**
 * Reads the listings recommended alongside a catalog listing, and whether
 * each is already in the workspace.
 *
 * @returns The companions in the order the listing names them. Empty while
 *   they load, when no listing is given, or when they could not be read.
 */
export function useCatalogListingCompanions(options: {
  catalogListingId: DataCatalogListing.Id | undefined;
  workspaceId: Workspace.Id;
}): readonly DataCatalogListing.ResolvedCompanion[] {
  const { catalogListingId, workspaceId } = options;
  const companionsQuery = useQuery({
    queryKey: [
      ...CATALOG_LISTING_COMPANIONS_QUERY_KEY,
      { catalogListingId, workspaceId },
    ],
    queryFn: () => {
      if (catalogListingId === undefined) {
        return NO_COMPANIONS;
      }
      return DataCatalogListingClient.getCompanions({
        catalogListingId,
        workspaceId,
      });
    },
    enabled: catalogListingId !== undefined,
  });
  return companionsQuery.data ?? NO_COMPANIONS;
}
