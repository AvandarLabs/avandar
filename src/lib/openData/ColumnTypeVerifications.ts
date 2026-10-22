import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import { DataCatalogRelationColumnClient } from "@/clients/data-catalog-listings/DataCatalogRelationColumnClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { createColumnTypeVerificationCoordinator } from "@/lib/openData/createColumnTypeVerificationCoordinator/createColumnTypeVerificationCoordinator";
import { verifyOpenDataColumnTypes } from "@/lib/openData/verifyOpenDataColumnTypes/verifyOpenDataColumnTypes";

/**
 * The app's one column type verification coordinator. After a listing's
 * types are written it refetches the catalog's listings and columns, so the
 * catalog shows, and adds, the verified columns.
 */
export const ColumnTypeVerifications = createColumnTypeVerificationCoordinator({
  verify: verifyOpenDataColumnTypes,
  onVerified: () => {
    void AvaQueryClient.invalidateQueries({
      queryKey: DataCatalogListingClient.QueryKeys.getAll(),
    });
    void AvaQueryClient.invalidateQueries({
      queryKey: DataCatalogRelationColumnClient.QueryKeys.getAll(),
    });
  },
});
