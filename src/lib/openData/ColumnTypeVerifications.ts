import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import { DataCatalogRelationColumnClient } from "@/clients/data-catalog-listings/DataCatalogRelationColumnClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { createColumnTypeVerificationCoordinator } from "@/lib/openData/createColumnTypeVerificationCoordinator/createColumnTypeVerificationCoordinator";
import { verifyOpenDataColumnTypes } from "@/lib/openData/verifyOpenDataColumnTypes/verifyOpenDataColumnTypes";

/**
 * Every cached query of catalog listings: searches, single listings, and
 * the full list. Query keys start with the client's name.
 */
const ALL_CATALOG_LISTING_QUERIES = [DataCatalogListingClient.getClientName()];

/**
 * The app's one column type verification coordinator. After a listing's
 * types are written it refetches the catalog's listings and columns, so the
 * catalog shows, and adds, the verified columns. After a failure it
 * refetches the listings, since the failure may have marked one invalid.
 */
export const ColumnTypeVerifications = createColumnTypeVerificationCoordinator({
  verify: verifyOpenDataColumnTypes,
  onVerified: () => {
    void AvaQueryClient.invalidateQueries({
      queryKey: ALL_CATALOG_LISTING_QUERIES,
    });
    void AvaQueryClient.invalidateQueries({
      queryKey: DataCatalogRelationColumnClient.QueryKeys.getAll(),
    });
  },
  onFailed: () => {
    void AvaQueryClient.invalidateQueries({
      queryKey: ALL_CATALOG_LISTING_QUERIES,
    });
  },
});
