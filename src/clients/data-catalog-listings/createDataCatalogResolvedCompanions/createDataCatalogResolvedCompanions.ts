import { DataCatalogListingJsonSchemas } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { Database } from "$/types/database.types";

/** One row `rpc_data_catalog_listings__get_companions` returns. */
export type DataCatalogCompanionDBRow =
  Database["public"]["Functions"]["rpc_data_catalog_listings__get_companions"]["Returns"][number];

/**
 * Builds the resolved companions of a listing from the rows the companions
 * RPC returned, in the order the listing names them. `kind` and `join_on`
 * come from the stored JSON, so a row whose kind is unknown or whose join
 * pairs are malformed is rejected rather than shown with a guessed reason.
 *
 * @throws When a row's `kind` or `join_on` does not parse.
 */
export function createDataCatalogResolvedCompanions(
  dbRows: readonly DataCatalogCompanionDBRow[],
): DataCatalogListing.ResolvedCompanion[] {
  return dbRows.map((dbRow) => {
    return {
      catalogListingId: dbRow.catalog_listing_id as DataCatalogListing.Id,
      displayName: dbRow.display_name,
      isWorkspaceLoadable: dbRow.is_workspace_loadable,
      isInvalid: dbRow.is_invalid,
      kind: DataCatalogListingJsonSchemas.companionKind.parse(dbRow.kind),
      joinOn: DataCatalogListingJsonSchemas.companionJoinOn.parse(
        dbRow.join_on,
      ),
      isInWorkspace: dbRow.is_in_workspace,
    };
  });
}
